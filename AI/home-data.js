/* =========================================================
   HOME PAGE CONTENT — edit freely, no other file needs to change.

   - keyContacts: "email" drives the mailto: link on the name.
     "image" is optional — leave "" to auto-generate the person's
     photo from SharePoint (accountname is derived from "email").
     Set "image" explicitly only if you want to override that.
   - trainings: leave "image" blank ("") to show a colored
     placeholder box — there's no auto-photo source for these
     (third-party providers), so a real image URL must be
     supplied manually if you want an icon/logo shown.
   - header.text: use a blank line (a real double newline) to
     start a new paragraph. Do not put HTML tags like <br> in
     here — they'll show up as literal text, not a line break.
   - worldClock: "timezone" must be a valid IANA timezone string
     (e.g. "Asia/Manila"). Times (and the small clock face)
     update automatically — do not hardcode a time here.
   ========================================================= */
window.HOME_DATA = {

  header: {
    title: "Welcome to Presales Navigator",
    text: `Your one-stop shop for everything you need to succeed in the field. This intranet site is designed to be your definitive resource, providing you with the knowledge, tools, and connections necessary to close deals and drive revenue. Here, you'll find comprehensive information on our service offerings, including detailed descriptions, key differentiators, and successful case studies.

Make this hub your first stop for all your sales-related needs. Regularly exploring its content will keep you up-to-date on our offerings, refine your sales skills, and maximize your effectiveness in the field. We encourage you to actively engage with the hub, provide feedback, and contribute to its ongoing improvement.

Your one place for battlecards, proposals, trainings, and every sales reference asset across Myridius. Browse by section on the left, or search everything above.`
  },

  /* NOTE: emails below are auto-derived as firstname.lastname@myridius.com
     to match the one confirmed example (Girish Pai). Not individually
     verified — please spot-check, especially three-part names. */
  keyContacts: [
    { name: "Girish Pai", role: "Chief Operations Officer", email: "girish.pai@myridius.com", image: "" },
    { name: "Akhil Jha", role: "Head of Solutions & Strategy", email: "akhil.jha@myridius.com", image: "" },
    { name: "Vinayak Kale", role: "Director - Solutions & Presales", email: "vinayak.kale@myridius.com", image: "" },
    { name: "Abhishek Sharma", role: "Director - Solutions & Presales", email: "abhishek.sharma@myridius.com", image: "" },
    { name: "Satyajyoti Roy", role: "Director - Solutions & Presales", email: "satyajyoti.roy@myridius.com", image: "" },
    { name: "Tushar Malhotra", role: "Associate Director - Solutions & Presales", email: "tushar.malhotra@myridius.com", image: "" },
    { name: "Amit Joshi", role: "Associate Director - Solutions & Presales", email: "amit.joshi@myridius.com", image: "" },
    { name: "Ajay Vijay Kamble", role: "Manager - Solutions & Presales", email: "ajay.kamble@myridius.com", image: "" },
    { name: "Shivam Talkhande", role: "Lead - Solutions & Presales", email: "shivam.talkhande@myridius.com", image: "" },
    { name: "Ayushi Gupta", role: "Lead - Business Analyst", email: "ayushi.gupta@myridius.com", image: "" }
  ],

  trainings: [
    { name: "AWS Migration Pre-Sales Learning Plan - Solution Managers (Partner)", image: "", url: "https://explore.skillbuilder.aws/learn/learning-plans/101/Pre-sales-Engineer-Learning-Plan-partner" },
    { name: "Datadog Partner Network Program", image: "", url: "https://www.datadoghq.com/partner/network/" },
    { name: "AWS Cloud Practitioner Essentials", image: "", url: "https://explore.skillbuilder.aws/learn/courses/134/aws-cloud-practitioner-essentials/lessons/136404/aws-cloud-practitioner-essentials" },
    { name: "Snowflake | SPN-SSP | Snowflake University: On-Demand", image: "", url: "https://learn.snowflake.com/courses/course-v1:snowflake+SPN-SSP+B/course/" },
    { name: "Gen AI & LLM on Databricks PreSales Partner Badge", image: "", url: "https://partner-academy.databricks.com/learn/courses/2494/gen-ai-llm-on-databricks-presales-partner-badge/lessons" },
    { name: "AWS Skill Builder", image: "", url: "https://explore.skillbuilder.aws/learn/courses/1096/aws-partner-accreditation-technical/lessons/148082/aws-partner-accreditation-technical" },
    { name: "Databricks Sales Ready - The Keys to 10X Multiplier of Partner Services Revenue with Databricks - FY25", image: "", url: "https://partner-academy.databricks.com/learn/courses/2436/on-demand-sales-ready-the-keys-to-10x-multiplier-of-partner-services-revenue-with-databricks-fy25/lessons/19045/introduction-resource-overview" },
    { name: "Microsoft Certified: Azure Fundamentals - Certifications", image: "", url: "https://learn.microsoft.com/en-us/credentials/certifications/azure-fundamentals/?practice-assessment-type=certification&WT.mc_id=certposter_poster-wwl" }
  ],

  worldClock: [
    { city: "Manila, Philippines", timezone: "Asia/Manila" },
    { city: "Chennai, India", timezone: "Asia/Kolkata" },
    { city: "Iselin, NJ", timezone: "America/New_York" },
    { city: "Houston, TX", timezone: "America/Chicago" }
  ]

};
