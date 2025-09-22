#!/bin/bash

# Script to resolve merge conflicts in landing pages
# This script will automatically resolve conflicts by taking the incoming changes (from codex-404 branch)

FILES=(
    "landing/src/pages/Features.tsx"
    "landing/src/pages/Instructions.tsx"
    "landing/src/pages/LearningProcess.tsx"
    "landing/src/pages/Pricing.tsx"
    "landing/src/pages/PrivacyPolicy.tsx"
    "landing/src/pages/Professions.tsx"
    "landing/src/pages/TermsOfService.tsx"
)

for file in "${FILES[@]}"; do
    echo "Resolving conflicts in $file..."
    
    # Use git checkout to take the incoming version (from codex-404)
    git checkout --theirs "$file"
    
    # Add the resolved file
    git add "$file"
done

echo "All conflicts resolved!"
