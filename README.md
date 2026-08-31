# PULSE

PULSE is a validation prototype for a gym revenue-recovery platform aimed at independent gyms in Montenegro.

It identifies memberships and attendance patterns that indicate churn risk, explains why each member needs attention, prepares recovery messages, and tracks renewed memberships and recovered revenue.

The demo includes two focused workspaces:

- **Owner:** revenue at risk, current earnings, weekly recovery impact, churn priorities, occupancy, and business trends.
- **Team:** a simplified daily contact queue where staff can record replies, missed contacts, follow-ups, and renewals without exposing the full financial dashboard.

The interface also includes a safe demo reset and a short pilot walkthrough for showing how a gym can start with an existing Excel or CSV member list.

## Demo journey

1. Open a high-risk member from the dashboard.
2. Review the risk explanation and recommended next action.
3. Edit and queue a WhatsApp, Viber, or SMS message.
4. Mark the membership as renewed and enter the renewal amount.
5. Confirm that recovered revenue increases and revenue at risk decreases.

All names and contact details are fictional. Messaging, authentication, payments, and external services are intentionally simulated. Demo changes are stored in the browser using local storage.

## Local development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## Vercel

Import this repository into Vercel. The included configuration selects Vite, runs `npm run build`, and publishes the `dist` directory. No environment variables are required for the prototype.
