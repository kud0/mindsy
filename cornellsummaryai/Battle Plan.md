
---

### **The "Launch by Next Week" Battle Plan**

**Guiding Principle:** Be ruthless with the scope for this MVP launch. The goal is to get a secure, working, and sellable product online. Features that can be added a week after launch *will be*.

---

### **Phase 1: Critical Infrastructure & Blockers (Do These First!)**

These tasks are the highest priority because they can have waiting periods or block other development.

#### **Task 1: The Domain & Core Services (Day 1)**
*   **Goal:** Secure your online identity and unlock core functionality.
*   **Sub-tasks:**
    1.  **Buy the Domain:** Decide on your final name (`NoteSpark.ai`, `GetMyNotes.ai`, etc.) and purchase it immediately from Namecheap or another registrar.✅
    2.  **Connect to Vercel:** In your Vercel project settings, add the custom domain and follow the instructions to update the DNS records in Namecheap. (DNS changes can take a few hours to propagate).
    3.  **Upgrade Supabase:** Go to your Supabase project settings and upgrade to the **Pro Plan**. This is a hard blocker.
    4.  **Increase File Limit:** Immediately after upgrading, go to Supabase Storage settings and increase the **File Size Limit** to `500mb` or more.
    5.  **Test Large Upload:** Run your local test script and successfully upload the 70MB file. **This validates your core value proposition.**

#### **Task 2: Financial & Communication Setup (Day 1-2)**
*   **Goal:** Get the money and communication channels ready.
*   **Sub-tasks:**
    1.  **Stripe Account:** Create or validate your Stripe account. Connect your bank card/account for payouts.
    2.  **Create Stripe Products:** In the Stripe dashboard, create two new "Products". Inside each, create a "Price" for the monthly subscription.
        *   Product 1: "Student Plan" -> Price: $12.99/month
        *   Product 2: "Pro Plan" -> Price: $24.99/month
        *   *(Save the Price IDs, you'll need them in your code).*
    3.  **Setup Resend:** Create a Resend account. Add and verify your new domain (this also requires DNS changes). Get your SMTP credentials.
    4.  **Configure Supabase SMTP:** Go to Supabase Auth -> SMTP Settings and enter the credentials from Resend. Test by signing up a new user with email/password and confirming you get the verification email.
    5.  **Setup Zoho Mail:** Create your free Zoho Mail account with your new domain. Set up the MX records in your DNS. You now have a working `info@yourdomain.com` inbox.

---

### **Phase 2: Core Product Development & Refinement (Day 2-4)**

Now we focus on the code and making the product work flawlessly.

#### **Task 3: Refactor Authentication (CRITICAL) (Day 2)**
*   **Goal:** Create a clean, secure, and standard authentication system.
*   **Sub-tasks:**
    1.  **Review Supabase Docs:** Familiarize yourself with Supabase's server-side auth helpers for Astro.
    2.  **Remove Custom Logic:** Rip out the "extra step" you mentioned. All session handling should be done via the official Supabase library.
    3.  **Implement Server-Side Client:** Ensure you are creating a `createServerClient` in your middleware and API routes to securely handle user sessions.
    4.  **Test Thoroughly:** Confirm that login, sign-up (with email confirmation), logout, and protected routes work perfectly on both `localhost` and your production Vercel URL.

#### **Task 4: Finalize AI & Backend Logic (Day 3-4)**
*   **Goal:** Make the core transcription and generation process perfect.
*   **Sub-tasks:**
    1.  **Add Language Detection:** Modify your `runpod-client.ts` to return the `detectedLanguage` from the Whisper API response.
    2.  **Pass Language to OpenAI:** Update your `generate.ts` API route to pass the `detectedLanguage` to your `openai-client.ts`.
    3.  **Refine the Master Prompt:** Update your `createCornellNotesPrompt` function with the final, powerful version we engineered (the one that forces the AI to detect and use the same language, creates a table of contents, and writes an expository summary).
    4.  **Add M4A Compatibility:** This is crucial. Your backend will need a step to convert M4A to MP3 before sending to Whisper. This can be done with an `ffmpeg` command on a small serverless function or by finding a RunPod Whisper template that accepts M4A directly. **Decision: For the MVP, it might be simpler to just state "MP3s only" and add M4A support in a week.** Let's defer this to save time.

---

### **Phase 3: User Experience & Final Polish (Day 5-6)**

With a working backend, we now make the frontend seamless.

#### **Task 5: Frontend Integration & Fixes (Day 5)**
*   **Goal:** Implement the final user-facing features and fix bugs.
*   **Sub-tasks:**
    1.  **Fix Mobile Menu:** Prioritize this. A broken UI kills trust.
    2.  **Setup Google OAuth:** Create the OAuth client on Google Cloud Console. Get the Client ID and Secret.
    3.  **Add Credentials to Supabase:** Add the Google credentials to your Supabase Auth Providers.
    4.  **Add Google Sign-in Button:** Add the `supabase.auth.signInWithOAuth({ provider: 'google' })` logic to your login page. Test it end-to-end.

#### **Task 6: Finalize Business Logic (Day 6)**
*   **Goal:** Simplify scope and finalize pricing tiers for launch.
*   **Strategic Decision - PDF Logic:** **For the MVP, do not accept PDF-only uploads.** The core value is audio. The optional PDF upload for context is a great feature, but it can be polished later. Let's keep the current flow: Audio is required, PDF is optional.
*   **Finalize Tiers:** Confirm the features for each tier.
    *   **Free:** 2 hours/month, 50 MB file limit (Supabase free tier), watermark.
    *   **Student ($12.99):** 40 hours/month, 500 MB file limit, no watermark.
    *   **Pro ($24.99):** 80 hours/month, 500 MB file limit, priority features.
*   **Implement Stripe Checkout:** Code the `create-checkout-session` API route using the Price IDs you created. Make sure the checkout buttons on your pricing page work.

---

### **Phase 4: Pre-Launch & Launch (Day 6-7)**

#### **Task 7: Marketing & Final Testing (Parallel Task)**
*   **Goal:** Prepare for users and do one last full test.
*   **Sub-tasks:**
    1.  **Warm up Audience:** As you said, start casually mentioning the problem you're solving in your WhatsApp groups. Don't sell yet, just talk about the pain point.
    2.  **Full End-to-End Test:** On Saturday, pretend you are a new user. Sign up with Google, hit the free tier limit, upgrade to the Student plan using a Stripe test card, upload a 70MB file, and download the result. The entire flow must be flawless.
    3.  **Prepare Launch Post:** Write the text for your launch announcement on Monday.

This is an intense but very achievable schedule. Good luck