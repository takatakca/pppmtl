# PPP PIZZERIA × URBANPIPER

## API & Integration Access Request Document

---

### Project

**PPP Pizzeria Digital Ordering Platform**

- Website: https://pppmtl.com

### Objective

Create a first-party PPP customer ordering experience while using UrbanPiper as the restaurant operation engine.

**PPP will own:**

- Customer experience
- Website
- Account system
- Customer relationship
- Loyalty experience
- Marketing
- SEO
- User interface
- Customer communication

**UrbanPiper will provide:**

- Menu management
- Product availability
- Modifier structure
- Order routing
- Kitchen/POS integration
- Order status events
- Marketplace aggregation

---

## 1. Account Access Requirements

Please provide:

### Organization Information

Required:

- UrbanPiper Organization ID
- Merchant ID
- Account ID
- Partner ID (if applicable)

### API Access

Required:

- API Base URL
- API documentation portal access
- API authentication method
- API key/token
- Client ID
- Client Secret

Environment required:

- [ ] Sandbox
- [ ] Production

---

## 2. Location Management

PPP is a multi-location restaurant group.

### Initial Connection

**PPP NDG**

Address:

```
6280 Avenue Somerled
Montréal, QC
```

Please provide:

- UrbanPiper Location ID
- Store ID
- Restaurant ID
- POS mapping ID
- KDS routing ID

### Future Locations

- Somerled
- Jean-Talon
- Sainte-Catherine
- Future franchise locations

Each location must support:

- Independent menu
- Independent availability
- Independent orders
- Independent reporting

---

## 3. Menu API Access

Required:

### Menu Read Access

Need access to:

- Categories
- Products
- Descriptions
- Images
- Prices
- Taxes
- Availability
- Nutritional information (if available)

### Modifier Access

Need complete modifier structure.

Examples:

**Pizza:**

- size
- crust
- toppings

**Chicken:**

- pieces
- sauce

**Poutine:**

- size
- extras

Required fields:

- modifier ID
- option ID
- required/optional
- minimum selections
- maximum selections
- price adjustment

---

## 4. Image Access

Please confirm:

Can PPP retrieve:

- product images
- category images
- promotional images

Requirements:

- CDN URLs
- image dimensions
- image rights for first-party display

---

## 5. Order Creation API

Required endpoints:

### Create Order

Need:

- endpoint
- request format
- authentication
- required fields

### Order Information

**Customer:**

- name
- phone
- email
- delivery address

**Items:**

- product ID
- modifier ID
- quantity
- notes

**Fulfillment:**

- pickup
- delivery

---

## 6. Order Status API

Required real-time statuses:

Examples:

- Created
- Accepted
- Preparing
- Ready
- Completed
- Cancelled

Need:

- status endpoint
- event format
- timestamp
- order reference

---

## 7. Webhook Access

PPP will provide webhook endpoint.

Required events:

- Order created
- Order accepted
- Order started
- Order ready
- Order completed
- Order cancelled

Please provide:

- webhook signature method
- signing secret
- retry policy
- event documentation

---

## 8. Payment Information

Please confirm available options:

- [ ] UrbanPiper payment integration
- [ ] External payment provider
- [ ] Clover integration
- [ ] Stripe support

PPP prefers:

> Customer payment handled through PPP-controlled checkout.

---

## 9. Customer Data Options

Please clarify:

Can UrbanPiper provide:

- customer order history
- customer profile sync
- customer phone lookup
- customer order status lookup

Important:

> PPP maintains the customer relationship. UrbanPiper receives only operational fulfillment data.

---

## 10. Marketplace Connections

Confirm existing connections:

- [ ] Uber Eats
- [ ] DoorDash
- [ ] SkipTheDishes
- [ ] Other

Need:

- order source identification
- marketplace order status
- cancellation handling

---

## 11. Reporting Access

Need access to:

- order analytics
- product performance
- sales reports
- store performance
- cancelled orders
- unavailable products

---

## 12. White Label Options

Please confirm:

Does UrbanPiper provide:

- white-label ordering
- API-only access
- custom frontend support
- partner/reseller program

PPP preference:

> Custom PPP frontend using UrbanPiper operational APIs.

---

## 13. Technical Requirements Summary

| Feature | Required |
| ------- | -------- |
| Menu Sync | YES |
| Product Images | YES |
| Modifier Sync | YES |
| Multi-location | YES |
| Order Creation | YES |
| Order Status | YES |
| Webhooks | YES |
| Sandbox | YES |
| Production API | YES |
| Marketplace Aggregation | YES |
| Reporting | YES |

---

## Security Requirements

PPP will never expose:

- API credentials
- Provider secrets
- Internal IDs
- Customer private information

All communication:

```
Frontend
    ↓
PPP Backend
    ↓
UrbanPiper
```

---

## Next Implementation Order After Access

### Phase 1

Connect NDG sandbox. Test:

- [ ] Menu pull
- [ ] Modifier sync
- [ ] Product images
- [ ] Test order
- [ ] Status events

### Phase 2

Activate NDG production.

### Phase 3

Clone to:

- Somerled
- Jean-Talon
- New locations

---

## Important Architecture Note

PPP website is not being replaced by UrbanPiper.

PPP becomes:

> "The customer-facing digital restaurant platform."

UrbanPiper becomes:

> "The restaurant operation engine."

This gives PPP the ability to scale into franchises while maintaining ownership of customer experience.

---

## Next After This Document

**PROMPT 24 — Customer Order Experience + My PPP Dashboard**

This is the part customers actually feel:

- "Your order was received"
- Animated order timeline
- Live preparation status
- Reorder previous meals
- Favourite items
- Saved addresses
- Receipts
- Loyalty points placeholder
- Support routing

That is where PPP starts feeling like a major chain application.
