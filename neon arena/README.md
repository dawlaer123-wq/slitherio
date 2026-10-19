# Neon Arena

Static browser game prepared for Vercel. No build command, framework, or dependencies are required.

## Deploy with Vercel

### Vercel Drop

1. Open Vercel Drop in a browser and sign in to your Vercel account.
2. Upload this entire `neon-arena-vercel` folder.
3. Wait for deployment to finish, then open the generated `.vercel.app` address.

### Git deployment

1. Put the contents of this folder in a GitHub repository.
2. In Vercel, import that repository as a new project.
3. Select **Other** as the framework preset.
4. Leave the build command and output directory empty, then deploy.

The game is served from `index.html` at the root of the generated site. Settings are saved in each visitor's browser using `localStorage`.
