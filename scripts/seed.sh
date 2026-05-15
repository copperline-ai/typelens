#!/bin/sh
set -e

BASE_URL="http://${TYPESENSE_HOST:-localhost}:${TYPESENSE_PORT:-8108}"
API_KEY="${TYPESENSE_API_KEY:-xyz}"

echo "Seeding Typesense at ${BASE_URL}..."

# Drop collection if it already exists (idempotent re-seed)
curl -s -o /dev/null -X DELETE "${BASE_URL}/collections/products" \
  -H "X-TYPESENSE-API-KEY: ${API_KEY}" || true

# Create the products collection
curl -s -f -X POST "${BASE_URL}/collections" \
  -H "Content-Type: application/json" \
  -H "X-TYPESENSE-API-KEY: ${API_KEY}" \
  -d '{
    "name": "products",
    "fields": [
      { "name": "id",          "type": "string" },
      { "name": "name",        "type": "string" },
      { "name": "description", "type": "string" },
      { "name": "category",    "type": "string",  "facet": true },
      { "name": "brand",       "type": "string",  "facet": true },
      { "name": "price",       "type": "float",   "facet": true },
      { "name": "rating",      "type": "float",   "facet": true },
      { "name": "in_stock",    "type": "bool",    "facet": true },
      { "name": "tags",        "type": "string[]","facet": true }
    ],
    "default_sorting_field": "rating"
  }'

echo "Collection created."

# Build JSONL batch (300 products across categories)
CATEGORIES="Electronics Clothing Books Home Sports Toys Beauty"
BRANDS="Acme BrightCo Zenith NovaGear SwiftMade PureForm"

build_documents() {
  i=1
  for cat in $CATEGORIES; do
    j=1
    while [ $j -le 43 ]; do
      brand=$(echo "$BRANDS" | tr ' ' '\n' | sed -n "$(( (i % 6) + 1 ))p")
      price=$(awk "BEGIN{printf \"%.2f\", 9.99 + ($i * 3.17) % 490}")
      rating=$(awk "BEGIN{printf \"%.1f\", 3.0 + ($i % 20) / 10.0}")
      in_stock=$([ $(( i % 5 )) -ne 0 ] && echo "true" || echo "false")
      printf '{"id":"%d","name":"%s %s #%d","description":"High quality %s product from %s. Perfect for everyday use.","category":"%s","brand":"%s","price":%s,"rating":%s,"in_stock":%s,"tags":["%s","popular"]}\n' \
        "$i" "$cat" "Item" "$j" "$(echo "$cat" | tr '[:upper:]' '[:lower:]')" "$brand" \
        "$cat" "$brand" "$price" "$rating" "$in_stock" "$(echo "$cat" | tr '[:upper:]' '[:lower:]')"
      i=$(( i + 1 ))
      j=$(( j + 1 ))
    done
  done
}

# Import in one batch
BATCH=$(build_documents)

echo "$BATCH" | curl -s -f -X POST "${BASE_URL}/collections/products/documents/import?action=create" \
  -H "Content-Type: text/plain" \
  -H "X-TYPESENSE-API-KEY: ${API_KEY}" \
  --data-binary @-

COUNT=$(echo "$BATCH" | wc -l | tr -d ' ')
echo ""
echo "Seeded ${COUNT} documents into 'products' collection."
