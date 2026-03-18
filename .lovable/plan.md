

## Probleem

De edge function logs tonen: `"Invalid parameter"` bij het aanmaken van templates (line 127 = de Meta API response). De Meta Graph API v25.0 wijst de request af.

**Oorzaak**: Het veld `parameter_format` wordt altijd meegestuurd (default `"positional"`), ook als er geen variabelen in de template zitten. Meta's API accepteert dit veld alleen wanneer er daadwerkelijk parameters aan