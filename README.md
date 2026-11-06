# Behtash Kiani: personal website

A one-page personal website with a portrait, contact links and a full resume.
It uses plain HTML, CSS and JavaScript, with no framework, build step or external scripts.

## Run it locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | All page content, including the resume text |
| `css/style.css` | Layout, colours and the light and dark themes |
| `js/main.js` | Theme toggle, title effect, scroll fade-ins and the k-means background |
| `assets/behtash-kiani.jpg` | Portrait |
| `Behtash_CV.pdf` | The resume offered for download |

## Updating the resume

Change the text in `index.html` and replace `Behtash_CV.pdf`. The two are not linked, so update both.

## Publish with GitHub Pages

In the repository, go to **Settings → Pages**, then set the source to the `main` branch and the `/ (root)` folder.
The site will be at https://behtashkiani.github.io/personal-website/.
