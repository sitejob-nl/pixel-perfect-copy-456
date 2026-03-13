

## Wat kun je doen met LinkedIn Webhooks?

LinkedIn Webhooks sturen real-time notificaties naar jouw app wanneer bepaalde events plaatsvinden. Voor jouw CRM zijn de meest waardevolle toepassingen:

### 1. **Post-engagement tracking**
Ontvang notificaties wanneer iemand je LinkedIn post liket, deelt of erop reageert. Dit kun je koppelen aan je CRM-contacten zodat je ziet welke leads interactie hebben met je content.

### 2. **Lead Syncing (Lead Gen Forms)**
Als je LinkedIn Lead Gen Forms gebruikt (advertenties), kun je leads automatisch laten binnenkomen in je CRM via de Lead Notification Subscriptions API — zonder handmatig exporteren.

### 3. **Mention/comment alerts**
Krijg een melding in je CRM wanneer iemand je tagt of reageert op je posts, zodat je snel kunt reageren.

---

### Technisch wat nodig is

Om dit te bouwen zou ik een **nieuwe Edge Function** maken (`linkedin-webhook`) die:

1. **Challenge-validatie** afhandelt — LinkedIn stuurt een GET met een `challengeCode`, de functie berekent een HMACSHA256 met je `LINKEDIN_CLIENT_SECRET` en stuurt het terug
2. **POST-notificaties** ontvangt — verifieert de `X-LI-Signature` header, dedupliceerd op Notification ID, en slaat events op
3. **Events opslaat** in een `linkedin_webhook_events` tabel, gekoppeld aan je organisatie

De webhook URL wordt: `https://fuvpmxxihmpustftzvgk.supabase.co/functions/v1/linkedin-webhook`

### Wat ik zou bouwen

| Component | Beschrijving |
|-----------|-------------|
| Edge Function `linkedin-webhook` | Challenge-response + event ontvangst met signature verificatie |
| DB tabel `linkedin_webhook_events` | Opslag van events (type, payload, notification_id voor dedup) |
| UI in Settings | Webhook URL tonen + status |
| Engagement feed | Events koppelen aan contacten en tonen in het CRM |

### Belangrijk

LinkedIn Webhooks zijn **alleen beschikbaar voor apps met een goedgekeurd use case**. Je moet in je LinkedIn Developer Portal eerst een webhook use case aanvragen en goedgekeurd krijgen voordat je webhooks kunt registreren.

---

**Wil je dat ik de webhook-ontvanger bouw zodat je klaar bent zodra LinkedIn je webhook use case goedkeurt?**

