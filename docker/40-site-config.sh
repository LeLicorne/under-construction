#!/bin/sh
# Génère config.js, les pages HTML (SEO inclus), manifest, robots.txt et sitemap.xml depuis l'env à chaque démarrage.
set -eu

WEB=/usr/share/nginx/html
TPL=/opt/templates

PROJECT_NAME=${PROJECT_NAME:-Portfolio}
AUTHOR=${AUTHOR:-Baptiste Lo Re}
# Deuxième graphie recherchée par les visiteurs ("baptiste lore" collé)
ALT_NAME=${ALT_NAME:-Baptiste Lore}
ALT_NAME_UPPER=$(printf '%s' "$ALT_NAME" | tr '[:lower:]' '[:upper:]')
JOB_TITLE=${JOB_TITLE:-Développeur front-end}
STATUS=${STATUS:-En chantier}
REVISION=${REVISION:-0.1}
CONTACT_EMAIL=${CONTACT_EMAIL:-contact@baptiste-lore.com}
SITE_URL=$(printf '%s' "${SITE_URL:-https://baptiste-lore.com}" | sed 's|/*$||')
TITLE=${SEO_TITLE:-$AUTHOR (Lore) – $JOB_TITLE React & React Native}
DESCRIPTION=${DESCRIPTION:-$AUTHOR ($ALT_NAME), développeur front-end React et React Native. Portfolio en construction : projets, parcours et contact bientôt en ligne.}
OG_IMAGE=${OG_IMAGE:-/assets/og.png}
LOCALE=${LOCALE:-fr_FR}
ROBOTS=${ROBOTS:-index, follow}
SAME_AS=${SAME_AS:-}

jesc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/</\\u003c/g'; }
hesc() { printf '%s' "$1" | sed -e 's/&/\&amp;/g' -e 's/</\&lt;/g' -e 's/>/\&gt;/g' -e 's/"/\&quot;/g'; }
sesc() { sed -e 's/[\\&|]/\\&/g'; }

OG_IMAGE_URL="$SITE_URL$OG_IMAGE"

cat > "$WEB/config.js" <<EOF
window.SITE = {
  projectName: "$(jesc "$PROJECT_NAME")",
  author: "$(jesc "$AUTHOR")",
  jobTitle: "$(jesc "$JOB_TITLE")",
  status: "$(jesc "$STATUS")",
  revision: "$(jesc "$REVISION")",
  contactEmail: "$(jesc "$CONTACT_EMAIL")",
  title: "$(jesc "$TITLE")",
  description: "$(jesc "$DESCRIPTION")",
};
EOF

# sameAs : profils publics (variable SAME_AS), omis du JSON-LD tant qu'elle est vide
same_as=""
if [ -n "$SAME_AS" ]; then
  same_as=$(printf '%s' "$SAME_AS" | tr ',' '\n' | while IFS= read -r u; do
    [ -n "$u" ] && printf '"%s",' "$(jesc "$u")"
  done | sed 's/,$//')
fi
same_as_line=""
if [ -n "$same_as" ]; then
  same_as_line=$(printf ',\n      "sameAs": [%s]' "$same_as")
fi

PERSON="{
      \"@type\": \"Person\",
      \"@id\": \"$(jesc "$SITE_URL")/#person\",
      \"name\": \"$(jesc "$AUTHOR")\",
      \"alternateName\": [\"$(jesc "$ALT_NAME")\", \"$(jesc "$ALT_NAME_UPPER")\"],
      \"jobTitle\": \"$(jesc "$JOB_TITLE")\",
      \"url\": \"$(jesc "$SITE_URL")/\",
      \"email\": \"$(jesc "$CONTACT_EMAIL")\",
      \"image\": \"$(jesc "$OG_IMAGE_URL")\"$same_as_line
    }"

WEBSITE="{
      \"@type\": \"WebSite\",
      \"@id\": \"$(jesc "$SITE_URL")/#website\",
      \"url\": \"$(jesc "$SITE_URL")/\",
      \"name\": \"$(jesc "$AUTHOR")\",
      \"alternateName\": [\"$(jesc "$ALT_NAME")\", \"$(jesc "$ALT_NAME_UPPER")\"],
      \"description\": \"$(jesc "$DESCRIPTION")\",
      \"inLanguage\": \"$(printf '%s' "$LOCALE" | tr '_' '-')\",
      \"publisher\": { \"@id\": \"$(jesc "$SITE_URL")/#person\" }
    }"

# Person + WebSite
cat > /tmp/jsonld-home <<EOF
{
  "@context": "https://schema.org",
  "@graph": [
    $PERSON,
    $WEBSITE
  ]
}
EOF

for tpl in "$TPL"/*.html; do
  page="$WEB/$(basename "$tpl")"
  cp "$tpl" "$page"
  for pair in \
    "TITLE=$TITLE" "DESCRIPTION=$DESCRIPTION" "AUTHOR=$AUTHOR" "JOB_TITLE=$JOB_TITLE" \
    "ROBOTS=$ROBOTS" "SITE_URL=$SITE_URL" "OG_IMAGE_URL=$OG_IMAGE_URL" "LOCALE=$LOCALE" \
    "CONTACT_EMAIL=$CONTACT_EMAIL" "ALT_NAME=$ALT_NAME"; do
    key=${pair%%=*}
    val=$(hesc "${pair#*=}" | sesc)
    sed -i "s|{{$key}}|$val|g" "$page"
  done
done
sed -i -e '/{{JSON_LD}}/{r /tmp/jsonld-home' -e 'd}' "$WEB/index.html"
rm -f /tmp/jsonld-home

cat > "$WEB/manifest.webmanifest" <<EOF
{
  "name": "$(jesc "$AUTHOR")",
  "short_name": "$(jesc "$AUTHOR")",
  "description": "$(jesc "$DESCRIPTION")",
  "lang": "fr",
  "start_url": "/",
  "display": "browser",
  "background_color": "#174a8b",
  "theme_color": "#174a8b",
  "icons": [
    { "src": "/assets/apple-touch-icon.png", "sizes": "180x180", "type": "image/png" },
    { "src": "/assets/favicon.svg", "sizes": "any", "type": "image/svg+xml" }
  ]
}
EOF

printf 'User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n' "$SITE_URL" > "$WEB/robots.txt"
cat > "$WEB/sitemap.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>$(hesc "$SITE_URL")/</loc><lastmod>$(date +%F)</lastmod></url>
</urlset>
EOF
