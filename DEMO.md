# ChairFill: the 90-second demo

Click-by-click. Works on the live demo (https://chairfill-app.vercel.app) or locally (`npm run demo`).
Start fresh: the circular arrow in the top-right corner resets the demo to Tuesday, 9:41 AM.

| Time | Click | Say |
|---|---|---|
| 0:00 | Open **Schedule**. Point at the dashed **Tue 2:00 PM** slot in Chair 5 and the **Open chairs** rail on the left. | "Tuesday morning at Maple Family Dental. Hannah just cancelled her 2:00 cleaning by text. That's $180 of empty chair, and there are four of these this week, $1,860 in all." |
| 0:10 | Click **Fill this slot** on Tue 2:00 PM. | "ChairFill has already ranked everyone who could take it. Gail is booked Thursday and said earlier is fine, so she's first. Rosa's waiting for a cleaning and wants Tuesday afternoons. Kevin's been waiting 58 days." Point at the reason chips, then open **Why this order**. |
| 0:25 | Click **Text Gail, Rosa and Kevin**. | "Three texts go out at once. First yes wins." Let the phones play: delivered, Rosa reads it, she's typing… |
| 0:35 | Rosa says **YES** (about 10 seconds at the default 2× speed). | "Rosa took it. The slot turns teal, and Gail and Kevin get a polite 'it's taken, you're still on the list.' Filled in 20 seconds. Zero phone calls." |
| 0:45 | Click **See what Rosa sees**. | "This is the page behind the link in the text: the appointment, directions, what to do before she comes in, and add-to-calendar." Close the tab. |
| 0:55 | Click **Done**. | "Back on the schedule: Tuesday at 2:00 has the bolt. Three open chairs left." |
| 1:00 | Open **Reports**. | "October so far: $4,100 recovered, 15 chairs, about 11 minutes to fill. Best hours, by visit type." Click **Audit log** on Rosa's row: "Every text and reply, for the office manager." |
| 1:15 | Open **Settings**, scroll to **Who gets texted first**. | "The practice owns the rules: the order, the 24-hour rest, quiet hours, and every message the patient sees." |
| 1:25 | Click the **?** in the header. | "And the whole idea in 25 seconds." The explainer plays. |

## If you have more time

- **The big one.** Fill **Wed 10:00 AM** (crown prep, $1,200). Luis is booked a week later and says yes. His old Wednesday 8:00 AM opens up, and a toast offers **Fill it**. One cancellation, two chairs filled.
- **Be the patient.** Start a fill, then click the link inside any text bubble. It opens that patient's page in a new tab. Tap **Yes, I'll take it** before Rosa does and watch the fill screen react. (Settings, Demo, Reply speed: **Real time** gives you more time.)
- **On your phone.** Switch the header to **Patient**. Scan the QR code on the right with your phone, then tap yes there. (Your phone keeps its own demo copy, so the desktop won't react. See "Stubbed" in the README.)
- **One at a time.** In the fill screen, pick **One at a time**. Kevin doesn't answer, so his 10-minute window fast-forwards (watch the "skipping quiet" note) before the next person is texted.
- **Manual override.** The **…** menu on any patient row: **Text only Rosa**, or **Rosa said yes on the phone** to book without texting.
- **Bulk import.** Waitlist, **Import CSV**, **Try the sample file**: 8 rows ready, 2 flagged with plain-English reasons, 1 duplicate warning.
- **Setup.** Settings, Demo, **Open setup**: seven steps ending with a test fill to three staff phones.
