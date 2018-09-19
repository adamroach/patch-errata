# patch-errata
Proof-of-concept for updating RFCs to contain errata

# Disclaimers
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
* The script operates on HTML-escaped text. Where the `escape-html` npm module
  and the RFC Editor's webpage have different notions about the necessity of
  escaping certain characters, matches that should be possible are overlooked.
  Operating directly on the database information should improve this situation.
* Errata are applied at the first place in the document that matches the old
  text. In the rare cases that the old text appears in multiple sections, the
  erratum may be inserted at the wrong point. This can be fixed by isolating
  document sections and searching only within the correct section.
* When multiple errata attempt to correct the same text, the results can be
  unexpected.
* Older documents are inconsistent about whether subsection headings and/or
  tables of contents are indented. This can confuse the section location
  logic.
* Several errata (especially early ones) could be matched more effectively
  by accounting for the use of `|` and `^` characters that some reporters
  use to indicate specific lines and columns to be changed (see, e.g.,
  [RFC 6016](https://adamroach.github.io/patched-rfcs/rfc/rfc6016.html))
* Many errata contain smartquotes and other UTF-8 characters, which should
  be normalized to their ASCII equivalents before attempting to apply them.
* While it renders okay, the HTML file that is output is pretty horrific.
* Characterset handling is incorrect.

# Prerequisites
This script is written in node, and requires relatively modern features.
* On OS X with Homebrew: `brew install node`
* On Debian-based Linux distributions (including Ubuntu): `sudo apt-get install node`

This script relies on the following node libraries, which are available via npm:

* [node-fetch](https://www.npmjs.com/package/node-fetch) 
* [node-html-parser](https://www.npmjs.com/package/node-html-parser) 
* [escape-html](https://www.npmjs.com/package/escape-html)

You can install them with: `npm install -g node-fetch node-html-parser
escape-html`

(If you'd prefer to install the packages in this directory instead of
globally, leave off the `-g` flag)

# Use

`./patch-errata.js <number>` where `<number>` is a raw number (no "rfc" or
".txt") (e.g. `./patch-errata.js 3261`)

The output is placed in a subdirectory called `out` (which you must create if
it does not exist) as `rfc<number>.html`.

# Example Output

The following documents have significant deployment and numerous errata
associated with them, and demonstrate the output of the script. Note that
the directory these files are in contains output for all RFCs that have
associated errata.

* [RFC 3261](https://adamroach.github.io/patched-rfcs/rfc/rfc3261.html) - Session Initiation Protocol (SIP)
* [RFC 5246](https://adamroach.github.io/patched-rfcs/rfc/rfc5246.html) - Transport Layer Security (TLS) 1.2
