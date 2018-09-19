# patch-errata
Proof-of-concept for updating RFCs to contain errata

# Disclaimer
This is a fairly simple script that I threw together pretty
quickly, with two high-level goals:
* Determining the feasibility of automatically inserting RFC Errata into the
  documents in sensible locations
* Exploring how such errata can be displayed to readers in a sensible and
  obvious fashion.

The script is neither elegant nor complete. There are a number of limitations
and known corner cases that need to be handled.  

* Currently, the script operates by scraping the human-readable errata page
  from the rfc-editor.org website.  While this generally works pretty well, it
  can get tripped up by the presence of certain phrases (e.g., "Notes:") in
  the errata text itself. The database that backs the RFC Editor's page
  contains semantic information (`section`, `orig_text`, and `correct_text`);
  using that information will eliminate such confusion.
* For the same reason, formatting of the "Notes" section of errata is
  occasionally haphazard. Again, working directly with the data in the form it
  exists in the errata database will eliminate this issue.
* Errata are applied at the first place in the document that matches the old
  text. In the rare cases that the old text appears in multiple sections, the
  erratum may be inserted at the wrong point. This can be fixed by isolating
  document sections and searching only within the correct section.
* When multiple errata attempt to correct the same text, the results can be
  unexpected.
* Older documents are inconsistent about whether subsection headings and/or
  tables of contents are indented. This can confuse the section location
  logic.
* While it renders okay, the HTML file that is output is pretty horrific.

# Prerequisites
This script relies on the following dependencies, which are available via npm:

* [node-fetch](https://www.npmjs.com/package/node-fetch) 
* [node-html-parser](https://www.npmjs.com/package/node-html-parser) 
* [escape-html](https://www.npmjs.com/package/escape-html)

You can install them with: `npm install node-fetch node-html-parser
escape-html`

# Use

`./patch-errata.js <number>` where `<number>` is a raw number (no "rfc" or
".txt") (e.g. `./patch-errata.js 3261`)

The output is placed in a subdirectory called `out` (which you must create if
it does not exist) as `rfc<number>.html`.
