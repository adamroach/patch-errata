#!/usr/local/bin/node
// vi:syntax=javascript

/* **********************************************************************
MIT License

Copyright (c) 2018 Adam Roach

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

********************************************************************** */

const fetch = require('node-fetch');
const parse = require('node-html-parser').parse;
const fs = require('fs');
const escape = require('escape-html');

let strayErrata = [];

const rfcNum = process.argv[2];

console.log("Processing errata for RFC " + rfcNum);

(async function main() {
  try {
    const rfcUrl = 'https://www.ietf.org/rfc/rfc' + rfcNum + '.txt';
    const errataUrl = 'https://www.rfc-editor.org/errata/rfc' + rfcNum;
    const outFile = "out/rfc" + rfcNum +  ".html";

    const errataHtml = await (await fetch(errataUrl)).text();
    const errata = parseErrata(errataHtml);

    let rfcText = await (await fetch(rfcUrl)).text();
    rfcText = "<pre>\n" + escape(rfcText) + "</pre>";

    errata.sort(function(a, b){return a['Errata ID'] - b['Errata ID']});

    errata.forEach(erratum => {
      if (['Verified', 'Held for Document Update'].
          includes(erratum.Status)) {
        rfcText = patch(rfcText, erratum);
      }
    });

    if (strayErrata.length > 0) {
      rfcText = "<div style='" +
                            "border:dashed;" +
                            "margin:8px;"+
                            "padding:24px;"+
                            "background-color:#FFFFAF;" +
                   "'>"+
                   "<b><i>This document has been updated by the " +
                   "following errata, which cannot be shown in-line " +
                   "in the document. Please see the end of this file "+
                   "for additional details: " +
                   strayErrata.join(', ') + "</i></b></div>" + rfcText;
    }

    fs.writeFile(outFile, rfcText, err => {if (err) throw err});
  } catch(e) {
    console.log("Exception: " + e);
  }

})();


function parseErrata(html) {
  const diff =
    /^Section (.+?) says:(.*?)\nIt should say:(.*?)(\nNotes:(.*))?$/s;

  const root = parse(html, {pre: true});
  const content = root.querySelector("div.singlepost.entry");

  let record = {body:''};
  let records = [];

  content.childNodes.forEach(e => {
    if (e.tagName == 'p' && e.firstChild.rawText.includes("Errata ID")) {
      e.structuredText.split("\n").forEach(line => {
        let tag, value;
        [tag, value] = line.split(": ");
        record[tag] = value;
      })
    }
    else if (e.tagName == 'div' && e.classNames.includes('special_hr')) {
      // End of record marker -- extract diff information, if possible
      const match = diff.exec(record.body);
      if (match) {
        record.section = match[1];
        record.oldText = match[2];
        record.newText = match[3];
        record.notes   = match[5];
      } else {
        const section = /section (\d[\d\.]*)/im.exec(record.body);
        if (section) {
          record.section = section[1];
        }
      }

      records.push(record);
      record = {body:''};
    }
    // If we've already read the start of the record and haven't hit
    // the end, add any text we encounter to the body of the errata
    else if (record.hasOwnProperty("Errata ID") && e.structuredText) {
      record.body += e.rawText + "\n";
    }
  });

  return records;
}

function patch(text, e) {
  // If we can find the old text, replace it.
  if (e.hasOwnProperty("oldText")) {
    const locator = new RegExp('(' + e.oldText.
                               replace(/([^a-zA-Z0-9\s])/g, "\\$1").
                               replace(/\s+/g,"\\s+") + ')');

    const match = locator.exec(text);
    if (match) {
      let annotation = "\n<font color='red'><s>" + match[1] +
                       "</s></font>" +
                       "</pre>" +
                       "<div style='" +
                                   "overflow:auto;" +
                                   "border:dashed;" +
                                   "margin:8px;"+
                                   "padding:24px;"+
                                   "background-color:#FFFFAF;" +
                       "'>"+
                       "<b><i>The preceding text has been updated by "+
                       e.Type +
                       " <a href='https://www.rfc-editor.org/errata/eid" +
                       e['Errata ID'] + "'>Errata " + e['Errata ID'] +
                       "</a> to instead read:</i></b>"+
                       "<pre style='margin:20px'>" +
                       e.newText +
                       "</pre>";
      if (e.notes) {
        annotation += "<i><b>Errata Notes: </b>" + e.notes + "</i>";
      }

      annotation += "</div><pre>\n";
      console.log("  Patching errata " + e["Errata ID"] + " in-line");
      return text.replace(locator, annotation);
    }
  }

  // If we know which section the errata belongs to, then place it
  // at the top of that section
  if (e.hasOwnProperty('section')) {
    const section = e.section.replace('.','\\.');
    const locator = new RegExp("(\n" + section + "[\. ].*?\n)");
    const match = locator.exec(text);
    if (match) {
      console.log("  Tagging errata " + e["Errata ID"] +
                  " at start of section " + e.section);

      let annotation = "\n</pre>" +
                       "<div style='" +
                                   "overflow:auto;" +
                                   "border:dashed;" +
                                   "margin:8px;"+
                                   "padding:24px;"+
                                   "background-color:#FFFFAF;" +
                       "'>"+
                       "<b><i>" + e.Type + " " +
                       "<a href='https://www.rfc-editor.org/errata/eid" +
                       e['Errata ID'] + "'>Errata " + e['Errata ID'] +
                       "</a> updates this section as follows:</i></b><br/>";

      if (e.oldText && e.newText) {
        annotation += "<br/><i><b>Old Text:</b></i><br/>" +
                      "<pre style='margin:20px'>" +
                      e.oldText + "</pre>";
        annotation += "<br/><i><b>New Text:</b></i><br/>" +
                      "<pre style='margin:20px'>" +
                      e.newText + "</pre>";
      } else {
        annotation += "<pre style='margin:20px'>" + e.body + "</pre>";
      }
      if (e.notes) {
        annotation += "<i><b>Errata Notes: </b>" + e.notes + "</i>";
      }

      annotation += "</div><pre>\n";

      return text.replace(locator, "$1" + annotation);
    }
  }

  // In the worst case, append the errata to the end of the document
  // and point to it from the very top.
  console.log("  Could not match " + e["Errata ID"] +
              " -- placing at end of document." );

  let annotation = "\n</pre>" +
                   "<div style='" +
                               "overflow:auto;" +
                               "border:dashed;" +
                               "margin:8px;"+
                               "padding:24px;"+
                               "background-color:#FFFFAF;" +
                   "'>"+
                   "<b><i>" + e.Type + " " +
                   "<a href='https://www.rfc-editor.org/errata/eid" +
                   e['Errata ID'] + "'>Errata " + e['Errata ID'] +
                   "</a> updates this document as follows:</i></b><br/>";

  annotation += "<pre style='margin:20px'>" + e.body + "</pre>";
  annotation += "</div><pre>\n";

  strayErrata.push(e.Type +
                   " <a href='https://www.rfc-editor.org/errata/eid" +
                   e['Errata ID'] + "'>Errata " + e['Errata ID'] +
                   "</a>");

  return text + annotation;
}
