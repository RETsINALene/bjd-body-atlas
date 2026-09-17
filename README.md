# Joint Measure — BJD Body Atlas

A website for storing, searching, and comparing BJD and MJD body measurements. It works without a server and can be hosted free with GitHub Pages:
[GitHub](https://retsinalene.github.io/bjd-body-atlas/)

## What is included

- Search by body or brand name.
- Filters for size, gender, type, and brand.
- Optional company image, maker source, and specification-sheet link.
- Side-by-side comparison using a library body or a custom body.
- Candidate measurements turn red when larger than the standard and green when smaller.
- Empty measurements remain empty and are not compared.
- Add-body form with local browser storage.
- JSON export/import for backing up local entries.
- Responsive desktop and mobile layouts.

The three included bodies are **fictional demo data**, not real maker specifications. Replace them before presenting the site as a factual catalog.

## Publish it on GitHub Pages

### 1. Create the repository

1. Sign in to [GitHub](https://github.com/).
2. Select **New repository**.
3. Name it, for example, `bjd-body-atlas`.
4. Choose **Public** if you want everyone to visit it.
5. Select **Create repository**.

### 2. Upload this project

The easiest method is to unzip the project, then drag all of its contents into the new repository using **Add file → Upload files**. Make sure the upload includes the hidden `.github` folder; it contains the automatic publishing workflow.

If you use Git on your computer instead:

```bash
git init
git add .
git commit -m "Create BJD body atlas"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/bjd-body-atlas.git
git push -u origin main
```

Replace `YOUR-NAME` with your GitHub username.

### 3. Turn on GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. Open the **Actions** tab and wait for “Deploy Joint Measure to GitHub Pages” to finish.
5. Return to **Settings → Pages**. GitHub will show the public URL, normally:

   `https://YOUR-NAME.github.io/bjd-body-atlas/`

Every later change pushed to the `main` branch publishes automatically.

## Add real bodies to the public catalog

Entries made with the website's **Add a body** button are private to that browser. This is intentional: a static GitHub Pages site cannot let visitors directly change the public database.

To publish an entry for everyone:

1. Open `dist/data.js` in GitHub.
2. Select the pencil icon to edit it.
3. Copy one object inside `window.BODY_DATA`.
4. Give it a unique `id` and replace the identity, categories, links, and measurements.
5. Remove `sample: true`.
6. Commit the change. GitHub Pages republishes automatically.

Example:

```js
{
  id: "maker-body-60-v2",
  name: "Body 60",
  brand: "Maker name",
  size: "1/3",
  gender: "Female",
  type: "BJD",
  version: "2026 version",
  image: "assets/maker-body-60.jpg",
  imageAlt: "Maker name Body 60",
  sourceUrl: "https://maker.example/body-60",
  documentUrl: "https://maker.example/body-60-size-chart.pdf",
  measurements: {
    height: 60,
    neckCircumference: 9.2,
    shoulderWidth: 12.1,
    bustCircumference: 25.5,
    waistCircumference: 17.8,
    hipCircumference: 27.1,
    thighCircumference: 15.2,
    armLength: 18.6,
    handLength: 6.8,
    legLength: 35.4,
    footLength: 7.2,
    footWidth: 2.8
  }
}
```

Unknown measurements can be omitted. Do not write an empty string or zero unless the real measurement is zero.

## Add company images

For an image stored in the repository:

1. Upload the image to `dist/assets/`.
2. Use a short filename such as `maker-body-60.jpg`.
3. Set the entry's image value to `assets/maker-body-60.jpg`.

You can also use an external `https://` image URL, but maker websites may block embedding or later change the address. A repository image is more reliable.

Only republish company images when the maker permits it. Always include `sourceUrl`, descriptive `imageAlt`, and any credit required by the maker. Linking to the company's product page without copying the image is the safest fallback.

## Change or add categories

Public filter choices are created automatically from the bodies in `dist/data.js`. If you use a new size, gender, type, or brand in a public entry, it appears in the filter automatically.

To add a choice to the local add-body form, edit the matching `<select>` in `dist/index.html`.

## Add another measurement

Add one line to `window.METRICS` near the top of `dist/data.js`:

```js
{ key: "calfCircumference", label: "Calf circumference" }
```

Then use the same key in a body's `measurements` object:

```js
calfCircumference: 10.4
```

The detail page, custom comparison, comparison table, and add-body form will all update automatically.

## Test locally

Opening `dist/index.html` directly works for most features. For the closest preview to GitHub Pages, run this command from the project folder:

```bash
python3 -m http.server 8000 --directory dist
```

Then visit [http://localhost:8000](http://localhost:8000).

## Project structure

```text
bjd-body-atlas/
├── .github/workflows/deploy-pages.yml
├── dist/
│   ├── assets/
│   │   ├── favicon.svg
│   │   └── sample-bjd-body.png
│   ├── app.js
│   ├── data.js
│   ├── index.html
│   └── styles.css
└── README.md
```

## Privacy and storage

Bodies added through the page are stored in that browser's IndexedDB. They do not upload anywhere and other visitors cannot see them. Use **Export my entries** to make a JSON backup, then **Import entries** on another device.

If you later want visitors to submit entries to one shared database, add an approval workflow and hosted database. That is a larger second version because public uploads need moderation, authentication, and image storage.
