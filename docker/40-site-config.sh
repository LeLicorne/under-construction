#!/bin/sh
# Génère config.js, index.html (SEO inclus), robots.txt et sitemap.xml depuis l'env à chaque démarrage.
set -eu

WEB=/usr/share/nginx/html
TPL=/opt/index.template.html

PROJECT_NAME=${PROJECT_NAME:-Portfolio}
AUTHOR=${AUTHOR:-Baptiste Lo Re}
JOB_TITLE=${JOB_TITLE:-Développeur front-end}
STATUS=${STATUS:-En chantier}
REVISION=${REVISION:-0.1}
CONTACT_EMAIL=${CONTACT_EMAIL:-contact@baptiste-lore.com}
SITE_URL=$(printf '%s' "${SITE_URL:-https://baptiste-lore.com}" | sed 's|/*$||')
TITLE=${SEO_TITLE:-$AUTHOR — $JOB_TITLE | Portfolio en construction}
DESCRIPTION=${DESCRIPTION:-Portfolio de $AUTHOR, $JOB_TITLE. Le site est en construction, les plans sont en cours de dessin.}
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

same_as=""
if [ -n "$SAME_AS" ]; then
  same_as=$(printf '%s' "$SAME_AS" | tr ',' '\n' | while IFS= read -r u; do
    [ -n "$u" ] && printf '"%s",' "$(jesc "$u")"
  done | sed 's/,$//')
fi
cat > /tmp/jsonld <<EOF
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "$(jesc "$SITE_URL")/#person",
      "name": "$(jesc "$AUTHOR")",
      "jobTitle": "$(jesc "$JOB_TITLE")",
      "url": "$(jesc "$SITE_URL")/",
      "email": "$(jesc "$CONTACT_EMAIL")",
      "image": "$(jesc "$OG_IMAGE_URL")",
      "sameAs": [$same_as]
    },
    {
      "@type": "WebSite",
      "@id": "$(jesc "$SITE_URL")/#website",
      "url": "$(jesc "$SITE_URL")/",
      "name": "$(jesc "$AUTHOR")",
      "description": "$(jesc "$DESCRIPTION")",
      "inLanguage": "$(printf '%s' "$LOCALE" | tr '_' '-')",
      "publisher": { "@id": "$(jesc "$SITE_URL")/#person" }
    }
  ]
}
EOF

cp "$TPL" "$WEB/index.html"
for pair in \
  "TITLE=$TITLE" "DESCRIPTION=$DESCRIPTION" "AUTHOR=$AUTHOR" "JOB_TITLE=$JOB_TITLE" \
  "ROBOTS=$ROBOTS" "SITE_URL=$SITE_URL" "OG_IMAGE_URL=$OG_IMAGE_URL" "LOCALE=$LOCALE"; do
  key=${pair%%=*}
  val=$(hesc "${pair#*=}" | sesc)
  sed -i "s|{{$key}}|$val|g" "$WEB/index.html"
done
sed -i -e '/{{JSON_LD}}/{r /tmp/jsonld' -e 'd}' "$WEB/index.html"
rm -f /tmp/jsonld

printf 'User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n' "$SITE_URL" > "$WEB/robots.txt"
cat > "$WEB/sitemap.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>$(hesc "$SITE_URL")/</loc><lastmod>$(date +%F)</lastmod></url>
</urlset>
EOF
