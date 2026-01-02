# SKU Backend Implementation Checklist

## Database Schema Updates
- [x] Add `sku_type_code` to ItemType model
- [x] Add `next_item_sequence` to ItemType model  
- [x] Add `sku_category_code` to ItemCategory model
- [x] Add `sku` to ItemMaster model
- [x] Add `sku_type_code` to ItemMaster model
- [x] Add `sku_category_code` to ItemMaster model
- [x] Add `sku_sequence` to ItemMaster model
- [x] Add `sku_variant1` to ItemMaster model
- [x] Add `sku_variant2` to ItemMaster model

## Backend Service Layer
- [x] Create `sku_service.py` with:
  - [x] `generate_item_type_code()`
  - [x] `generate_category_code()`
  - [x] `generate_item_sequence_code()`
  - [x] `generate_variant_code()`
  - [x] `construct_sku()`
  - [x] `parse_sku()`
  - [x] `get_sku_display()`
  - [x] `generate_complete_sku()` helper

## API Endpoints - ItemType Routes
- [ ] **POST /api/item-types** - Create Item Type
  - [ ] Call `SKUService.generate_item_type_code(type_name)`
  - [ ] Store in `ItemType.sku_type_code`
  - [ ] Initialize `ItemType.next_item_sequence = 0`
  - [ ] Return created ItemType with SKU code

- [ ] **GET /api/item-types/:id** - Get Item Type
  - [ ] Include `sku_type_code` in response

- [ ] **PUT /api/item-types/:id** - Update Item Type
  - [ ] Do not allow changing `sku_type_code` (read-only)

## API Endpoints - Category Routes
- [ ] **POST /api/categories** - Create Category (Level 1)
  - [ ] Call `SKUService.generate_category_code(name)`
  - [ ] Store in `ItemCategory.sku_category_code`
  - [ ] Return with SKU category code

- [ ] **POST /api/sub-categories** - Create Sub-Category (Level 2-5)
  - [ ] Generate category code from this level's name
  - [ ] Store in ItemCategory
  - [ ] Return with SKU code

- [ ] **GET /api/categories/:code** - Get Category Details
  - [ ] Include `sku_category_code` in response
  - [ ] Include all level information

- [ ] **PUT /api/categories/:code** - Update Category
  - [ ] Do not allow changing `sku_category_code` (read-only)

- [ ] **GET /api/categories/tree** - Get Category Hierarchy Tree
  - [ ] Include `sku_category_code` for each node
  - [ ] Format: `{ code, name, sku_category_code, level, ... }`

## API Endpoints - Item Routes
- [ ] **POST /api/items** - Create Item (ItemMaster)
  - [ ] Get ItemType to retrieve `sku_type_code` and increment counter
  - [ ] Get ItemCategory to retrieve `sku_category_code`
  - [ ] Call `SKUService.generate_item_sequence_code(current_counter)`
  - [ ] Call `SKUService.generate_variant_code(color_name, 'color', 4)` for variant1
  - [ ] Call `SKUService.generate_variant_code(size_name, 'size', 2)` for variant2
  - [ ] Call `SKUService.construct_sku(...)` to create full SKU
  - [ ] Increment `ItemType.next_item_sequence += 1`
  - [ ] Store all SKU components in ItemMaster
  - [ ] Return created item with complete SKU

- [ ] **GET /api/items/:code** - Get Item Details
  - [ ] Include all SKU components in response
  - [ ] Include parsed SKU components for display

- [ ] **PUT /api/items/:code** - Update Item
  - [ ] Allow updating color/size (variant codes)
  - [ ] Regenerate variant codes if color/size changed
  - [ ] Regenerate full SKU if variants changed
  - [ ] Do NOT allow changing type/category/sequence codes

- [ ] **GET /api/items** - List Items
  - [ ] Include SKU in response for each item
  - [ ] Support filtering by SKU components

- [ ] **DELETE /api/items/:code** - Delete Item
  - [ ] Soft delete (maintain SKU in history)
  - [ ] Do not reuse sequence number

## API Endpoints - SKU Operations (New)
- [ ] **GET /api/sku/next** - Get Next SKU for Type
  - [ ] Input: `item_type_code`
  - [ ] Output: `{ next_sku: "FM-XXXX-A0001-XXXX-XX", sequence: "A0001" }`
  - [ ] Used in Item Create form

- [ ] **POST /api/sku/validate** - Validate SKU Format
  - [ ] Input: `{ sku: string }`
  - [ ] Output: `{ valid: boolean, components: {...}, errors: [...] }`
  - [ ] Validate format and uniqueness

- [ ] **GET /api/sku/search** - Search by SKU Component
  - [ ] Input: `?component=RNCK&type=category` (optional)
  - [ ] Output: `[items matching component]`
  - [ ] Enable quick lookups

- [ ] **POST /api/sku/parse** - Parse SKU String
  - [ ] Input: `{ sku: string }`
  - [ ] Output: `{ components: { type, category, sequence, variant1, variant2 } }`

## Validation & Error Handling

- [ ] **SKU Uniqueness**
  - [ ] Check full SKU uniqueness before saving
  - [ ] Return error if SKU already exists
  - [ ] Log duplicate SKU attempts

- [ ] **SKU Format Validation**
  - [ ] Validate all components are present
  - [ ] Validate component lengths
  - [ ] Validate character types
  - [ ] Return detailed validation errors

- [ ] **Sequence Number Validation**
  - [ ] Prevent sequence counter corruption
  - [ ] Lock ItemType during sequence generation
  - [ ] Implement retry logic for concurrent creates

- [ ] **Category Code Generation**
  - [ ] Handle special characters in category names
  - [ ] Avoid duplicate category codes
  - [ ] Log category code generation process

## Data Migration (If Needed)

- [ ] **Backfill Existing ItemTypes**
  - [ ] Generate `sku_type_code` from `type_code`
  - [ ] Initialize `next_item_sequence` from max existing item count
  - [ ] Update all ItemType documents

- [ ] **Backfill Existing Categories**
  - [ ] Generate `sku_category_code` from category name
  - [ ] Update all ItemCategory documents

- [ ] **Backfill Existing Items**
  - [ ] Generate complete SKUs for all existing items
  - [ ] Extract and store all SKU components
  - [ ] Ensure no duplicate SKUs
  - [ ] Log migration progress

## Logging & Monitoring

- [ ] **SKU Generation Logs**
  - [ ] Log each SKU generation with timestamp
  - [ ] Include user info and reason
  - [ ] Track generation failures

- [ ] **Sequence Counter Updates**
  - [ ] Log counter increments
  - [ ] Alert on counter corruption
  - [ ] Implement recovery mechanism

- [ ] **SKU Uniqueness Violations**
  - [ ] Log all duplicate SKU attempts
  - [ ] Alert on patterns of duplicates
  - [ ] Trigger manual review if needed

## Testing

### Unit Tests
- [ ] `test_generate_item_type_code()`
- [ ] `test_generate_category_code()`
- [ ] `test_generate_item_sequence_code()`
- [ ] `test_generate_variant_code()` - Color variants
- [ ] `test_generate_variant_code()` - Size variants
- [ ] `test_construct_sku()`
- [ ] `test_parse_sku()`
- [ ] `test_sku_edge_cases()` - Special characters, nulls, etc.

### Integration Tests
- [ ] **Create ItemType Flow**
  - [ ] Create type, verify SKU type code generated
  - [ ] Verify in database

- [ ] **Create Category Flow**
  - [ ] Create category hierarchy
  - [ ] Verify category code generated at each level
  - [ ] Verify deepest level code used in items

- [ ] **Create Item Flow**
  - [ ] Create item in category
  - [ ] Verify complete SKU generated
  - [ ] Verify all components stored
  - [ ] Verify sequence incremented

- [ ] **Concurrent Item Creation**
  - [ ] Create multiple items simultaneously
  - [ ] Verify no duplicate SKUs
  - [ ] Verify sequences non-overlapping

- [ ] **SKU Uniqueness**
  - [ ] Attempt duplicate SKU creation
  - [ ] Verify error returned
  - [ ] Verify no data corruption

- [ ] **Data Retrieval**
  - [ ] Get item with full SKU
  - [ ] Get category with SKU code
  - [ ] Search by SKU component
  - [ ] List items with SKUs

### API Tests
- [ ] **POST /api/item-types**
  - [ ] Valid type creation → SKU code generated
  - [ ] Duplicate type → Error

- [ ] **POST /api/categories**
  - [ ] Valid category creation → SKU code generated
  - [ ] Level-based code generation → Correct codes

- [ ] **POST /api/items**
  - [ ] Valid item creation → Complete SKU generated
  - [ ] Missing variants → SKU with padding
  - [ ] Color variant → Stored correctly
  - [ ] Size variant → Stored correctly

- [ ] **GET /api/items**
  - [ ] List returns SKU in each item
  - [ ] SKU components accessible
  - [ ] Correct format/structure

- [ ] **GET /api/sku/next**
  - [ ] Returns next available SKU
  - [ ] Correct format
  - [ ] Increments on item creation

- [ ] **POST /api/sku/validate**
  - [ ] Valid SKU → Pass
  - [ ] Invalid format → Fail with details
  - [ ] Duplicate → Fail with message

- [ ] **GET /api/sku/search**
  - [ ] Search by component → Results
  - [ ] Empty results → Empty array
  - [ ] Partial matches → Correct filtering

## Documentation

- [ ] **API Documentation**
  - [ ] Document all SKU endpoints
  - [ ] Include request/response examples
  - [ ] Document error codes

- [ ] **Database Schema Documentation**
  - [ ] Document new SKU fields
  - [ ] Document field constraints
  - [ ] Document relationships

- [ ] **Developer Guide**
  - [ ] How to use SKUService
  - [ ] Common patterns
  - [ ] Troubleshooting guide

- [ ] **Admin Guide**
  - [ ] How SKU is generated
  - [ ] How to query by SKU
  - [ ] Migration procedures
  - [ ] Backup/recovery procedures

## Deployment

- [ ] **Database Migration**
  - [ ] Create migration script
  - [ ] Test on staging environment
  - [ ] Backup production database
  - [ ] Run migration
  - [ ] Verify data integrity

- [ ] **Code Deployment**
  - [ ] Deploy SKU service
  - [ ] Deploy updated models
  - [ ] Deploy API endpoints
  - [ ] Update frontend code
  - [ ] Clear cache

- [ ] **Smoke Tests**
  - [ ] Create new ItemType
  - [ ] Create new Category
  - [ ] Create new Item
  - [ ] Verify SKUs generated
  - [ ] Verify displays in UI

- [ ] **Rollback Plan**
  - [ ] Keep database backup
  - [ ] Document rollback steps
  - [ ] Test rollback procedure
  - [ ] Define rollback criteria

## Post-Deployment

- [ ] **Monitoring**
  - [ ] Monitor SKU generation errors
  - [ ] Monitor duplicate SKU attempts
  - [ ] Monitor API performance

- [ ] **User Training**
  - [ ] Document SKU meaning for users
  - [ ] Explain component breakdown
  - [ ] Provide examples

- [ ] **Support Readiness**
  - [ ] Prepare FAQ for SKU questions
  - [ ] Create troubleshooting guide
  - [ ] Document common issues

---

## Priority & Timeline

### Phase 1: Core Implementation (Week 1)
- Database schema updates
- SKU service layer
- ItemType & Category SKU code generation
- API endpoints for retrieval

### Phase 2: Item Integration (Week 2)
- Item creation SKU generation
- Item update handling
- SKU validation endpoints
- Error handling

### Phase 3: Testing & Polish (Week 3)
- Comprehensive unit tests
- Integration tests
- API tests
- Bug fixes

### Phase 4: Deployment (Week 4)
- Database migration
- Staging deployment
- Production deployment
- Post-deployment monitoring

---

**Status:** Ready for Backend Implementation
**Last Updated:** January 2, 2026
**Version:** 1.0
