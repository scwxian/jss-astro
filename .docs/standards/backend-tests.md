# Backend Testing Standards

## Core Constraints & Principles
* **Integer Cents Only**: ALL financial calculations must use integer cents. Floating-point math is strictly prohibited for money. Use `assertAllIntegerCents(result)` to verify.
* **Pure Functions & Immutability**: Modifiers must never mutate the input state. Always verify original state equality.
* **Coverage Targets**: Require 100% coverage for `calc-engine` (modifiers, pipeline) and financial logic. Maintain 95% for resolvers.
* **File Organization**: Test files (`*.test.ts` or `*.spec.ts`) must sit directly adjacent to the source file they test.

## Environment & Tooling
* **Framework**: Vitest (Node environment, globals enabled).
* **Path Aliases**: Standard aliases (e.g., `@calc-engine/*`) map to `src/features/calc-engine/*`.
* **Fixtures**: Always inspect `src/__test__/fixtures/index.ts` to verify exact parameter signatures before calling test factories.
* **Mocking Strategy**: 
  * Use Vitest's built-in `vi.mock()` and `vi.spyOn()` for internal module dependencies.
  * Use **MSW (Mock Service Worker)** for mocking external API requests (e.g., payment gateways, CMS). Never hit real external APIs in tests.

## Comprehensive Test Pattern Example
Use this structure to implement the AAA (Arrange, Act, Assert) pattern, handle async operations, errors, pure functions, and test factories.

```typescript
import { describe, expect, it, vi } from "vitest";
import { calculatePrice, fetchTaxRateAsync } from "./module.ts";
import { assertAllIntegerCents } from "../../__test__/helpers/test-utils.ts";
// Always check parameter signatures in this barrel export:
import { createCartWithSingleItem } from "../../__test__/fixtures/index.ts";

// 1. Internal Module Mocking Example
vi.mock("./tax-service", () => ({
  getExternalTaxRate: vi.fn().mockResolvedValue(0.05) // 5%
}));

describe("calculatePrice & Pipeline", () => {
  describe("Sync Pure Functions (Happy Path & Immutability)", () => {
    it("applies modifier without mutating input state", () => {
      // Arrange
      const inputState = createCartWithSingleItem('prod_1', 2);
      const originalStateCopy = JSON.parse(JSON.stringify(inputState));
      
      // Act
      const result = calculatePrice(inputState, { discountCents: 1000 });
      
      // Assert
      assertAllIntegerCents(result); // Math validation
      expect(result.grandTotal).toBe(9000); // Expected: 10000 - 1000
      expect(inputState).toEqual(originalStateCopy); // Immutability check
    });
  });

  describe("Async Operations & Error Handling", () => {
    it("fetches data asynchronously", async () => {
      // Act
      const rate = await fetchTaxRateAsync('US-CA');
      // Assert
      expect(rate).toBe(0.05);
    });

    it("throws specific error on invalid input", async () => {
      // Arrange
      const invalidInput = createCartWithSingleItem('prod_1', -1);
      
      // Act & Assert
      await expect(() => fetchTaxRateAsync(invalidInput)).rejects.toThrow("Invalid Quantity");
    });
  });

  describe("Test Factory Pattern (Multiple Configurations)", () => {
    const scenarios = [
      { name: "Base prices only", config: { enableTaxes: false }, expected: 10000 },
      { name: "With tax enabled", config: { enableTaxes: true }, expected: 10500 },
    ];

    scenarios.forEach(({ name, config, expected }) => {
      it(`calculates correctly for scenario: ${name}`, () => {
        const state = createCartWithSingleItem('prod_1', 1);
        const result = calculatePrice(state, config);
        
        expect(result.grandTotal).toBe(expected);
      });
    });
  });
});
```
