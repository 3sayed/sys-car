# Database

The source of truth is `admin/database/migrations/2026_10_15_000001_create_marketplace.php`. The schema runs on MySQL 8 and SQLite. Laravel's standard users, password reset, sessions, cache and queue tables are retained, with a separate Sanctum token migration.

| Module           | Tables                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accounts & shops | users, roles, user_roles, shops, shop_members, shop_branches, user_vehicles                                                                                           |
| Vehicles         | vehicle_makes, vehicle_models, vehicle_variants, vehicle_identifiers                                                                                                  |
| Master catalog   | part_categories, part_manufacturers, parts, part_images, part_compatibility, part_cross_references, part_attributes                                                   |
| Marketplace      | shop_parts, inventory_movements, price_history, favorites, shop_reviews                                                                                               |
| Requests         | part_requests, part_request_images, request_offers, notifications                                                                                                     |
| Simulation       | simulation_models, simulation_components, repair_procedures, repair_procedure_vehicles, repair_procedure_parts, repair_steps, repair_step_animations, simulation_jobs |
| AI & imports     | ai_conversations, ai_messages, catalog_sources, catalog_imports, catalog_import_errors, media_assets                                                                  |

Laravel uses its conventional `users.password` column to store a password hash rather than the document's illustrative `password_hash` name. Passwords are never returned by the User serializer.

## Invariants

- Manufacturer plus normalized part number uniquely identifies a master catalog part.
- One part/vehicle fitment pair is unique.
- A listing is unique by branch, part, SKU and condition; different branches or conditions can list the same part.
- All monetary database columns are DECIMAL(12,3). API listing and offer prices are decimal strings. Display formatting is separate from monetary persistence.
- Vehicle identity includes make/model, production range, engine, trim and market.
- Category parents and simulation component parents use self-referencing foreign keys.
- Repair step numbers are unique within a procedure.
- One quotation per shop/request is updated in place until the request closes.
- Favorite and shop-review pairs are unique per user.
- Laravel timestamps use UTC; clients format values for display.
- Foreign keys preserve parent integrity; transactional domain operations enforce valid status transitions and permissions.

## CSV imports

Exact UTF-8 header:

```csv
manufacturer,category,part_number,name,description,vehicle_variant_id
Demo Components,Braking,BP-1001,Front Brake Pad Set,Sample description,1
```

See `docs/examples/catalog.csv`. Every row is validated independently. Valid rows upsert the central part and add its fitment; invalid rows produce import errors with physical row numbers (header is row 1). Repeated fitments do not duplicate. The queue job updates processed and total row counts while streaming. A completed import can have row errors.

Only admins can import or mutate the master catalog. Supplier inventory remains independent. Sources and media attribution are records of provenance, not proof that a third-party license is sufficient.
