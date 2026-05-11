import { describe, expect, it, vi, beforeEach } from "vitest";
import {
	stableStringify,
	generateHash,
	acquireCheckoutLock,
	completeCheckoutLock,
	releaseCheckoutLock,
} from "./checkout.lock.ts";

// Mock KVNamespace
const mockKV = {
	get: vi.fn(),
	put: vi.fn(),
	delete: vi.fn(),
} as unknown as KVNamespace;

describe("stableStringify", () => {
	it("should stringify primitives correctly", () => {
		expect(stableStringify(null)).toBe("null");
		expect(stableStringify(undefined)).toBe(undefined);
		expect(stableStringify("test")).toBe('"test"');
		expect(stableStringify(42)).toBe("42");
		expect(stableStringify(true)).toBe("true");
	});

	it("should stringify arrays correctly", () => {
		expect(stableStringify([1, 2, 3])).toBe("[1,2,3]");
		expect(stableStringify(["a", "b"])).toBe('["a","b"]');
	});

	it("should sort object keys alphabetically", () => {
		const obj = { c: 3, a: 1, b: 2 };
		const result = stableStringify(obj);
		expect(result).toBe('{"a":1,"b":2,"c":3}');
	});

	it("should handle nested objects with sorted keys", () => {
		const obj = { z: 1, a: { y: 2, x: 1 } };
		const result = stableStringify(obj);
		expect(result).toBe('{"a":{"x":1,"y":2},"z":1}');
	});

	it("should produce identical output for same data with different key order", () => {
		const obj1 = { a: 1, b: 2, c: 3 };
		const obj2 = { c: 3, b: 2, a: 1 };
		expect(stableStringify(obj1)).toBe(stableStringify(obj2));
	});

	it("should handle arrays of objects", () => {
		const obj = { items: [{ b: 2, a: 1 }, { d: 4, c: 3 }] };
		const result = stableStringify(obj);
		expect(result).toBe('{"items":[{"a":1,"b":2},{"c":3,"d":4}]}');
	});

	it("should handle Date objects", () => {
		const date = new Date("2024-01-15T10:30:00.000Z");
		const result = stableStringify({ date });
		expect(result).toBe('{"date":"2024-01-15T10:30:00.000Z"}');
	});

	it("should handle undefined values in objects by omitting them", () => {
		const obj = { a: 1, b: undefined, c: 3 };
		const result = stableStringify(obj);
		expect(result).toBe('{"a":1,"c":3}');
	});

	it("should handle undefined values in arrays as null", () => {
		const arr = [1, undefined, 3];
		const result = stableStringify(arr);
		expect(result).toBe("[1,null,3]");
	});
});

describe("generateHash", () => {
	it("should generate consistent SHA-256 hash for same input", async () => {
		const payload = { test: "data" };
		const clientIp = "192.168.1.1";

		const hash1 = await generateHash(payload, clientIp);
		const hash2 = await generateHash(payload, clientIp);

		expect(hash1).toBe(hash2);
		expect(hash1).toHaveLength(64);
	});

	it("should generate different hashes for different payloads", async () => {
		const hash1 = await generateHash({ test: "data1" }, "192.168.1.1");
		const hash2 = await generateHash({ test: "data2" }, "192.168.1.1");

		expect(hash1).not.toBe(hash2);
	});

	it("should generate different hashes for different IPs", async () => {
		const payload = { test: "data" };
		const hash1 = await generateHash(payload, "192.168.1.1");
		const hash2 = await generateHash(payload, "192.168.1.2");

		expect(hash1).not.toBe(hash2);
	});

	it("should generate deterministic hash regardless of object key order", async () => {
		const payload1 = { a: 1, b: 2, c: 3 };
		const payload2 = { c: 3, b: 2, a: 1 };
		const clientIp = "192.168.1.1";

		const hash1 = await generateHash(payload1, clientIp);
		const hash2 = await generateHash(payload2, clientIp);

		expect(hash1).toBe(hash2);
	});
});

describe("acquireCheckoutLock", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return 'acquired' when no existing lock", async () => {
		mockKV.get = vi.fn().mockResolvedValue(null);
		mockKV.put = vi.fn().mockResolvedValue(undefined);

		const result = await acquireCheckoutLock({
			payload: { test: "data" },
			clientIp: "192.168.1.1",
			kvNamespace: mockKV,
		});

		expect(result.status).toBe("acquired");
		if (result.status === "acquired") {
			expect(result.lockKey).toBeDefined();
			expect(typeof result.lockKey).toBe("string");
		}
		expect(mockKV.put).toHaveBeenCalled();
	});

	it("should return 'processing' when lock exists with processing status", async () => {
		mockKV.get = vi.fn().mockResolvedValue({
			status: "processing",
			createdAt: Date.now(),
		});

		const result = await acquireCheckoutLock({
			payload: { test: "data" },
			clientIp: "192.168.1.1",
			kvNamespace: mockKV,
		});

		expect(result.status).toBe("processing");
		expect(mockKV.put).not.toHaveBeenCalled();
	});

	it("should return 'completed' with checkoutUrl when lock exists with completed status", async () => {
		mockKV.get = vi.fn().mockResolvedValue({
			status: "completed",
			checkoutUrl: "https://payment.example.com/checkout/123",
			createdAt: Date.now(),
		});

		const result = await acquireCheckoutLock({
			payload: { test: "data" },
			clientIp: "192.168.1.1",
			kvNamespace: mockKV,
		});

		expect(result.status).toBe("completed");
		if (result.status === "completed") {
			expect(result.checkoutUrl).toBe("https://payment.example.com/checkout/123");
		}
		expect(mockKV.put).not.toHaveBeenCalled();
	});
});

describe("completeCheckoutLock", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should update lock to completed status with checkout URL", async () => {
		mockKV.put = vi.fn().mockResolvedValue(undefined);

		await completeCheckoutLock(
			"test-lock-key",
			"https://payment.example.com/checkout/123",
			mockKV,
		);

		expect(mockKV.put).toHaveBeenCalledWith(
			"test-lock-key",
			expect.stringContaining('"status":"completed"'),
			expect.objectContaining({
				expirationTtl: 300,
			}),
		);
	});
});

describe("releaseCheckoutLock", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should delete the lock from KV", async () => {
		mockKV.delete = vi.fn().mockResolvedValue(undefined);

		await releaseCheckoutLock("test-lock-key", mockKV);

		expect(mockKV.delete).toHaveBeenCalledWith("test-lock-key");
	});
});