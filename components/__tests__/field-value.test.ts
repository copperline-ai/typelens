import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isImageUrl, probeImageUrl } from "../field-value";

describe("isImageUrl", () => {
  describe("standard image extensions", () => {
    it("detects .jpg URLs", () => {
      expect(isImageUrl("https://example.com/photo.jpg")).toBe(true);
    });

    it("detects .jpeg URLs", () => {
      expect(isImageUrl("https://example.com/photo.jpeg")).toBe(true);
    });

    it("detects .png URLs", () => {
      expect(isImageUrl("https://example.com/photo.png")).toBe(true);
    });

    it("detects .gif URLs", () => {
      expect(isImageUrl("https://example.com/photo.gif")).toBe(true);
    });

    it("detects .webp URLs", () => {
      expect(isImageUrl("https://example.com/photo.webp")).toBe(true);
    });

    it("detects .avif URLs", () => {
      expect(isImageUrl("https://example.com/photo.avif")).toBe(true);
    });

    it("detects .bmp URLs", () => {
      expect(isImageUrl("https://example.com/photo.bmp")).toBe(true);
    });

    it("detects .svg URLs", () => {
      expect(isImageUrl("https://example.com/photo.svg")).toBe(true);
    });

    it("is case-insensitive", () => {
      expect(isImageUrl("https://example.com/photo.JPG")).toBe(true);
      expect(isImageUrl("https://example.com/photo.PNG")).toBe(true);
    });

    it("works with query parameters", () => {
      expect(isImageUrl("https://example.com/photo.jpg?w=800&h=600")).toBe(true);
    });

    it("rejects non-image extensions", () => {
      expect(isImageUrl("https://example.com/doc.pdf")).toBe(false);
      expect(isImageUrl("https://example.com/video.mp4")).toBe(false);
    });
  });

  describe("data URIs", () => {
    it("detects data:image URIs", () => {
      expect(isImageUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    });

    it("detects data:image with other formats", () => {
      expect(isImageUrl("data:image/webp;base64,UklGRho=")).toBe(true);
    });
  });

  describe("CDN path patterns", () => {
    it("detects /photo/ in path", () => {
      expect(isImageUrl("https://images.unsplash.com/photo-123456")).toBe(true);
    });

    it("detects /image/ in path", () => {
      expect(isImageUrl("https://cdn.example.com/image/abc123")).toBe(true);
    });

    it("detects /img/ in path", () => {
      expect(isImageUrl("https://cdn.example.com/img/abc123")).toBe(true);
    });
  });

  describe("field-name-based detection", () => {
    it.each([
      "photo",
      "image",
      "picture",
      "avatar",
      "thumbnail",
      "cover",
      "screenshot",
      "img",
      "icon",
      "logo",
      "banner",
      "hero",
    ])("detects '%s' field name", (fieldName) => {
      expect(isImageUrl("https://example.com/some-id", fieldName)).toBe(true);
    });

    it("is case-insensitive for field names", () => {
      expect(isImageUrl("https://example.com/some-id", "Photo")).toBe(true);
      expect(isImageUrl("https://example.com/some-id", "IMAGE")).toBe(true);
      expect(isImageUrl("https://example.com/some-id", "Avatar")).toBe(true);
    });

    it("rejects non-image field names even on URL-like strings", () => {
      expect(isImageUrl("https://example.com/file.pdf", "name")).toBe(false);
      expect(isImageUrl("https://example.com/file.pdf", "description")).toBe(false);
    });

    it("field name takes priority over non-image URL", () => {
      expect(isImageUrl("https://example.com/file.pdf", "photo")).toBe(true);
    });

    it("returns false with no fieldName on extensionless URL", () => {
      expect(isImageUrl("https://images.unsplash.com/some-id")).toBe(false);
    });
  });

  describe("non-URL strings", () => {
    it("returns false for invalid strings", () => {
      expect(isImageUrl("not-a-url")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isImageUrl("")).toBe(false);
    });
  });
});

describe("probeImageUrl", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when content-type starts with image/", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      headers: new Map([["content-type", "image/jpeg"]]),
    } as Response);

    const result = await probeImageUrl("https://example.com/photo");
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith("https://example.com/photo", { method: "HEAD" });
  });

  it("returns false when content-type is not image/", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      headers: new Map([["content-type", "application/pdf"]]),
    } as Response);

    const result = await probeImageUrl("https://example.com/doc");
    expect(result).toBe(false);
  });

  it("returns false on network error", async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await probeImageUrl("https://example.com/photo");
    expect(result).toBe(false);
  });
});
