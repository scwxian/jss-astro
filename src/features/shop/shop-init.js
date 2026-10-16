/**
 * Shop Initialization
 * Imports and registers all Web Components needed for shop/product pages.
 * - quick-view-modal.js (for QuickView modal pre-registration)
 * - ProductCoreUI.astro (for full product pages)
 */

import "@components/Carousel/base-carousel.js";
import "@components/DatePicker/date-picker.js";
import "@components/Accordion/accordion.js";
import "./VariantSelector/variant-selector.js";
import "./AddToCartForm/add-to-cart-form.js";
import "./PurchaseSubscriptionForm/purchase-subscription.js";
import "@components/BentoCarousel/bento-carousel.js";
import "@components/YouTubeModal/youtube-modal.js";
import "@live-stock/live-stock.js";
