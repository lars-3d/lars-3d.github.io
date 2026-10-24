# LARS-3D — project page

Source for <https://lars-3d.github.io>, the project page for

> **LARS-3D: Linear Global-Context Aggregation in Sparse Convolutional Networks
> for Robust Outdoor 3D Point Cloud Segmentation**
> Daniel Fusaro¹, Antonio Santo², Wanmeng Li¹, Simone Mosco¹,
> David Valiente², Arturo Gil², Alberto Pretto¹
> ¹ Dept. of Information Engineering (DEI), University of Padua, Italy
> ² University Institute for Engineering Research, Miguel Hernández University, Elche, Spain
> *IEEE Robotics and Automation Letters*, 2026.

## Layout

```
index.html                  the whole page
static/css/style.css        design tokens + components (light & dark)
static/js/main.js           theme, scrollspy, hero point cloud, tabs,
                            compare slider, lightbox, charts
static/images/              figures exported from the paper sources
static/pdf/lars3d.pdf       the accepted camera-ready
```

No build step and no runtime dependencies: open `index.html`, or serve the
folder with `python3 -m http.server`. GitHub Pages publishes the repository
root as-is (`.nojekyll` keeps Jekyll out of the way).

## Figures

The two diagrams from the paper are **vector**, so their labels stay sharp at any
zoom and can be selected and searched like ordinary text:

- **Figure 2 (architecture)** is inlined directly in `index.html`. Inkscape
  converts `pics/archi.pdf` to SVG with real `<text>` nodes; a post-pass
  resamples the embedded point-cloud rasters down to the size they are actually
  displayed at, adds metric-compatible font fallbacks (Liberation Serif ->
  Times New Roman, Liberation Sans -> Arial) and strips editor metadata.
- The **GCA encoder** and **GCA block** close-ups are not separate files: each is
  an `<svg>` with a cropped `viewBox` and a `<use href="#archi-root">`, so they
  cost no extra bytes and can never drift from the main diagram.
- **Figure 1 (teaser)** is inlined too, built from the draw.io export
  `eccv26-motiv_revise.svg`. Its three bar charts are vector paths and its
  captions are real HTML inside `<foreignObject>`, so both stay sharp and the
  captions are selectable. Two caveats handled in the build: the rewrite is done
  on the raw text, because ElementTree would namespace the XHTML to `<html:div>`
  and the HTML parser then drops the line breaks; and draw.io's `light-dark()`
  colours are collapsed to their light value, since the figure always sits on a
  white plate. The satellite and camera photographs are swapped for the
  full-resolution originals, which makes the web version sharper than the
  printed figure.
- `static/images/teaser-og.jpg` is the raster stand-in for social-card previews
  (`og:image` cannot be an SVG) and for the lightbox, because `<foreignObject>`
  is not painted when an SVG is loaded as an image.

Equation markup under the architecture figure uses `eq-`-prefixed class names on
purpose: `.num` is already a monospace helper in the base stylesheet, and an
unprefixed `.num` silently pulled JetBrains Mono into the fraction's numerator.

The dataset photographs, annotated scans, trajectory map and class-distribution
plot are raster by nature and stay as `.jpg` / `.png`.

## Before going public

Search the HTML for `TODO` — three placeholders are still open:

- author homepage links in the hero (`<p class="authors">`);
- the arXiv button (`aria-disabled` until the ID exists);
- the EastPark download button (same).

Also confirm `https://github.com/lars-3d/LARS-3D` is the right code repository.

Per-class point counts in the dataset section were recovered from the published
class-distribution figure and are marked as approximate; replace them with the
exact counts in `CLASSES` (`static/js/main.js`) if you have them. The list of
classes absent from sequence 02 (road, sidewalk, rubber, car, bicycle,
motorcycle) was verified directly against the label files.
