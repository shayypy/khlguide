# khl-tvg

This is a simple worker/static file generator that proxies the schedule for KHL TV/KHL Prime. As a file generator, it makes available two files for each locale: the raw endpoint response (.json) and an opinionated EPG file (.xml). It is opinionated in that it attempts to "normalize" some programmes (games) in order to make the guide more compatible with DVR systems. 

## Files

- [guide, english](/public/en.xml)
- [guide, russian](/public/ru.xml)
- [guide, chinese](/public/cn.xml)
- [raw, english](/public/en.json)
- [raw, russian](/public/ru.json)
- [raw, chinese](/public/cn.json)

Use the guide files directly in your DVR program (such as [Dispatcharr](https://github.com/Dispatcharr/Dispatcharr)), or use the raw files to build your own.

## Development

To install dependencies:

```bash
bun install
```

To run a development server with wrangler (no files generated):

```bash
bun dev
```

Or, generate static files for each language in `public/` instead:

```bash
bun generate
```

This project was created using `bun init` in bun v1.3.14. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.
