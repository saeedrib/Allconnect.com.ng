# Student Loan Found — updated frontend package

## Included in this update
- Refreshed student-loan-focused homepage, typography, spacing and mobile responsive styling.
- Expanded homepage with portal overview, steps and a clear independent-portal disclaimer.
- More structured student application form sections.
- Ad interstitial after sign-in: **Open Advertisement, then Continue to Dashboard**, then **Continue to Dashboard**.
- Ad step repeats after logout and a fresh login.
- Frontend check to discourage a second loan application from the same account.

## Important deployment and production notes
This ZIP is a frontend update only. It has not been deployed to Vercel. Upload these four files to the existing Vercel project and deploy before the live website changes.

The ad gate only detects that the student clicked the ad link; it cannot prove that the ad was fully viewed or guarantee a visit. The external ad opens in a new tab. Confirm the advertising provider permits this flow and review its terms before production use.

The duplicate-application check in this version is in the browser. For reliable enforcement, add a database unique constraint or a secure server-side rule allowing only one active/submitted application per user. Do not rely on frontend checks alone.

The homepage intentionally describes Student Loan Found as an independent portal. Do not imply government ownership, guaranteed approval or guaranteed funding unless formally authorised and documented.

The form currently includes bank/BVN fields from the previous version. Collect BVN or bank data only after confirming the programme's lawful need and implementing appropriate security and privacy controls. Document upload still needs wiring to the private Supabase Storage bucket before collecting files.

## Existing Supabase connection
The existing Supabase URL and publishable key are retained in `app.js`. No service-role key or Twilio credentials are included.

## Deploy
1. Download and extract the ZIP.
2. Upload the contents of the `student-loan-found` folder to the existing Vercel project, replacing the previous frontend files.
3. Deploy.
4. Test signup/login, ad gate, continue, logout/re-login, application submission, and duplicate submission using a test account.


## Production-readiness notes
- The frontend points to the existing Supabase project and uses Supabase Auth plus the `profiles`, `user_roles`, and `loan_applications` tables.
- The connected Supabase project was inspected: it is active, the required tables exist, and Row Level Security is enabled with student/admin policies.
- This is a real database-connected portal, not a browser-only demo. However, it is not yet a fully verified lending/disbursement service. The programme owner must confirm its legal authority, eligibility rules, funding source, privacy notice and operational process.
- Bank account and BVN fields have been removed from this version until the programme's lawful need and security controls are confirmed.
- Document upload is not enabled yet. Do not ask students to upload documents until private storage and access policies are configured.
- Before public launch, fix the Supabase security advisor warnings and test signup, email verification, login, student isolation, admin permissions, application submission and status updates with separate test accounts.
