import { describe, it, expect } from "vitest";
import { classifyEmail, matchEmailToApplication } from "../services/gmail.service.js";

describe("classifyEmail", () => {
  it("detects rejection", () => {
    const result = classifyEmail(
      "Update on your application",
      "Unfortunately, we have decided to move forward with other candidates."
    );
    expect(result).toEqual({ status: "REJECTED", confidence: "HIGH" });
  });

  it("detects interview invitation", () => {
    const result = classifyEmail(
      "Interview Invitation - Software Engineer",
      "We would like to schedule an interview with you for next week."
    );
    expect(result).toEqual({ status: "INTERVIEW", confidence: "HIGH" });
  });

  it("detects offer", () => {
    const result = classifyEmail(
      "Offer Letter",
      "We are pleased to extend an offer for the position of Senior Developer."
    );
    expect(result).toEqual({ status: "OFFER", confidence: "HIGH" });
  });

  it("detects screening", () => {
    const result = classifyEmail(
      "Phone Screen",
      "Hi, I'd like to set up a quick phone screen to discuss the role."
    );
    expect(result).toEqual({ status: "SCREENING", confidence: "MEDIUM" });
  });

  it("detects application confirmation", () => {
    const result = classifyEmail(
      "Application Received",
      "Thank you for applying to our company."
    );
    expect(result).toEqual({ status: "APPLIED", confidence: "LOW" });
  });

  it("returns null for unrelated email", () => {
    const result = classifyEmail(
      "Weekly Newsletter",
      "Check out our latest blog post about tech trends."
    );
    expect(result).toBeNull();
  });
});

describe("matchEmailToApplication", () => {
  const apps = [
    { id: "1", companyName: "Google" },
    { id: "2", companyName: "Meta" },
    { id: "3", companyName: "Stripe" },
  ];

  it("matches by company name in body", () => {
    const result = matchEmailToApplication(
      "recruiter@example.com",
      "Your Application",
      "Thank you for your interest in Google.",
      apps
    );
    expect(result).toBe("1");
  });

  it("matches by email domain", () => {
    const result = matchEmailToApplication(
      "jobs@stripe.com",
      "Application Update",
      "We reviewed your profile.",
      apps
    );
    expect(result).toBe("3");
  });

  it("returns null when no match", () => {
    const result = matchEmailToApplication(
      "noreply@random.com",
      "Hello",
      "Just checking in.",
      apps
    );
    expect(result).toBeNull();
  });
});
