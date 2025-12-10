#!/bin/bash
# Generate placeholder PWA icons for CEM
# These should be replaced with proper branded icons

echo "🎨 Generating placeholder CEM icons..."

# Create icons directory if it doesn't exist
mkdir -p frontend/public/icons

# Icon sizes for PWA
SIZES=(72 96 128 144 152 192 384 512)

# SVG template for CEM icon (wheat/agriculture theme with green background)
for size in "${SIZES[@]}"; do
  cat > "frontend/public/icons/icon-${size}x${size}.png.svg" << EOF
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${size}" height="${size}" fill="#15803d" rx="$((size/8))"/>
  
  <!-- Wheat icon (simplified) -->
  <g transform="translate($((size/2)), $((size/2)))">
    <!-- Stem -->
    <line x1="0" y1="$((size/4))" x2="0" y2="-$((size/4))" 
          stroke="white" stroke-width="$((size/20))" stroke-linecap="round"/>
    
    <!-- Leaves -->
    <circle cx="-$((size/8))" cy="0" r="$((size/10))" fill="#fbbf24"/>
    <circle cx="$((size/8))" cy="-$((size/12))" r="$((size/10))" fill="#fbbf24"/>
    <circle cx="-$((size/10))" cy="-$((size/6))" r="$((size/11))" fill="#fbbf24"/>
    <circle cx="$((size/9))" cy="-$((size/5))" r="$((size/11))" fill="#fbbf24"/>
  </g>
  
  <!-- Text badge -->
  <text x="${size}/2" y="$((size*3/4))" 
        font-family="Arial, sans-serif" 
        font-size="$((size/8))" 
        font-weight="bold"
        fill="white" 
        text-anchor="middle">CEM</text>
</svg>
EOF
done

echo "✅ Placeholder SVG files created in frontend/public/icons/"
echo ""
echo "⚠️  NOTE: These are SVG placeholders."
echo "   To generate actual PNG icons, you can:"
echo "   1. Use an online tool like https://realfavicongenerator.net/"
echo "   2. Use ImageMagick: convert icon.svg -resize 192x192 icon-192x192.png"
echo "   3. Design proper icons in Figma/Photoshop with CEM branding"
echo ""
echo "   Recommended: Use PWA Asset Generator"
echo "   npm install -g pwa-asset-generator"
echo "   pwa-asset-generator logo.svg frontend/public/icons"
echo ""
