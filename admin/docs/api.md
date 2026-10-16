# REST API v1

Base URL: `http://localhost:8000/api/v1`. Send `Accept: application/json`, JSON request bodies and `Authorization: Bearer <token>` for protected routes. Multipart photos use field `image`.

Validation errors return 422 with a `message` and `errors` map. Unauthenticated requests return 401, denied ownership 403/404, invalid state transitions 409 and rate limits 429. Paginated resources return Laravel's `data`, page and total fields.

## Public

| Method | Route                   | Purpose                                                      |
| ------ | ----------------------- | ------------------------------------------------------------ |
| POST   | /auth/register          | name, email, password, password_confirmation; optional phone |
| POST   | /auth/login             | email and password; returns token and user                   |
| GET    | /vehicles               | Exact variants, paginated                                    |
| GET    | /categories             | Category list                                                |
| GET    | /parts                  | q, vehicle_variant_id, category_id, page                     |
| GET    | /parts/{id}             | Attributes, fitment, images and supplier prices              |
| GET    | /shops/{id}             | Active supplier, branches and reviews                        |
| GET    | /simulations            | Approved procedures; optional vehicle_variant_id             |
| GET    | /simulations/{id}       | Approved procedure, steps and viewer/model URL               |
| GET    | /simulations/{id}/model | Approved model stream; private candidates return 404         |

## Authenticated customer/account operations

| Method       | Route                                | Purpose                                               |
| ------------ | ------------------------------------ | ----------------------------------------------------- |
| GET / PATCH  | /me                                  | Profile; PATCH accepts name and phone                 |
| POST         | /auth/logout                         | Revoke current token                                  |
| GET / POST   | /garage                              | Saved vehicles; POST variant ID and nickname          |
| DELETE       | /garage/{id}                         | Remove owned garage row                               |
| GET          | /favorites                           | Saved catalog parts                                   |
| PUT / DELETE | /favorites/{partId}                  | Add/remove favorite                                   |
| POST         | /shops/{id}/reviews                  | rating 1–5, comment                                   |
| GET          | /notifications                       | In-app notifications, paginated                       |
| PATCH        | /notifications/{id}                  | Mark own notification read                            |
| GET / POST   | /requests                            | Own requests / create a request                       |
| POST         | /requests/{id}/cancel                | Cancel own open request                               |
| POST         | /requests/{id}/images                | Up to five JPG/PNG/WebP files, 5 MB each              |
| GET          | /request-images/{id}                 | Authorized private image                              |
| POST         | /requests/{id}/offers/{offer}/accept | Accept a pending offer once                           |
| GET          | /ai/conversations                    | Own conversation history                              |
| GET          | /ai/conversations/{id}               | Own messages                                          |
| POST         | /ai/chat                             | message, vehicle_variant_id, optional conversation_id |

Create request body:

```json
{
  "vehicle_variant_id": 1,
  "part_id": 1,
  "description": "Front brake pads for my Camry",
  "quantity": 1
}
```

Omit `part_id` for an unknown/unlisted component. A specified part must have recorded fitment for the selected variant.

## Supplier operations

| Method     | Route                                 | Purpose                                                       |
| ---------- | ------------------------------------- | ------------------------------------------------------------- |
| GET / POST | /supplier/shops                       | Authorized shops / create an owned shop                       |
| PATCH      | /supplier/shops/{id}                  | Owner/manager edits name and description                      |
| POST       | /supplier/shops/{id}/branches         | Owner/manager creates a branch                                |
| POST       | /supplier/shops/{id}/members          | Owner adds/updates a registered email with staff/manager role |
| DELETE     | /supplier/shops/{id}/members/{member} | Owner revokes membership                                      |
| GET / POST | /supplier/inventory                   | List authorized inventory / create a listing                  |
| PATCH      | /supplier/inventory/{id}              | Change SKU, price, quantity, condition and status             |
| GET        | /supplier/inventory/{id}/history      | Stock and price audit history                                 |
| GET        | /supplier/requests                    | Open requests; only caller's quotations included              |
| POST       | /supplier/requests/{id}/offers        | shop_id, price, currency, availability                        |

Listing creation body:

```json
{
  "branch_id": 1,
  "part_id": 1,
  "supplier_sku": "SHOP-BP-1",
  "price": "12.000",
  "currency": "BHD",
  "quantity": 8,
  "condition": "new",
  "status": "active"
}
```

Currencies: BHD, SAR, AED, USD. Conditions: new, used, refurbished. Listing status: active, inactive. Offer availability: available_now, by_order. Existing listing currency, part and branch are immutable through PATCH; create a new listing for a different identity/currency.

## Limits and administration

API: 120 requests/minute per authenticated user or anonymous IP. Login/registration: 5/minute per IP/email and 30/minute per IP. AI: 10/minute per user.

Admin endpoints are ordinary session-authenticated forms under `/admin`; every mutation checks admin role and CSRF. See `admin/routes/web.php` for the authoritative route list.
