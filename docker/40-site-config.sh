#!/bin/sh
set -eu

esc() { printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g' -e 's/</\\u003c/g'; }

cat > /usr/share/nginx/html/config.js <<EOF
window.SITE = {
  projectName: "$(esc "${PROJECT_NAME:-Portfolio}")",
  author: "$(esc "${AUTHOR:-Baptiste LO RE}")",
  status: "$(esc "${STATUS:-En chantier}")",
  revision: "$(esc "${REVISION:-0.1}")",
  contactEmail: "$(esc "${CONTACT_EMAIL:-contact@baptiste-lore.com}")",
  description: "$(esc "${DESCRIPTION:-Le site est en chantier. Les plans sont en cours de dessin.}")",
};
EOF
