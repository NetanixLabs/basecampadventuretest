# HBL (2C2P PACO) test double

Lets developers test the Himalayan Bank card payments end to end without the bank's sandbox.

1. `node scripts/hbl-test/make-keys.mjs` creates throwaway merchant and PACO key pairs in `scripts/hbl-test/keys.json` (git-ignored).
2. Paste them in Admin → Settings → Keys → HBL (merchant private keys, PACO public keys, office ID `9104050000`, API key `TESTAPIKEY123`), mode **Sandbox**, and switch HBL on in Settings → Features → Payments.
3. `node scripts/hbl-test/mock-paco.mjs` starts the test bank on port 4555.
4. Start the site with `HBL_TEST_HOST=http://127.0.0.1:4555` (only used in sandbox mode, never in production).
5. Book with HBL, open `/pay/<reference>/`, then approve or decline:
   `curl "http://127.0.0.1:4555/simulate?order=<orderNo>&result=A&notify=http://localhost:3000/api/webhooks/hbl/"`
   (`result=F` declines; `amountText=000000000100` fakes a wrong amount.)

With the bank's real sandbox keys, skip steps 1, 3 and 4: paste their keys and use mode Sandbox.
