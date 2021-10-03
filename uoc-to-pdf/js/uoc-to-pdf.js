const pdfObjOptions = {
  pdfOpenParams: {
    navpanes: 0,
    toolbar: 1,
    statusbar: 0,
    view: "FitV"
  },
  forcePDFJS: true,
  /*PDFJS_URL: "PDF.js/web/viewer.html"*/
};

function progressBarUpdater(bar) {
  bar.progressbar({value: 0})
  return function(c, t) {
    bar.progressbar({value: c, max: t})
  }
}

function update(metadata) {
  const pImages    = progressBarUpdater($("#progressbar1"))
  const pData      = progressBarUpdater($("#progressbar2"))
  const pDocPages  = progressBarUpdater($("#progressbar3"))
  const pDocImages = progressBarUpdater($("#progressbar4"))

  const dPages  = _.partial(deferPages, _)
  const dFilter = _.partial(deferFilter, _, 5)
  const dImages = _.partial(deferImages, _, pImages)
  const dData   = _.partial(deferData, _, pData)
  const dEmbed  = _.partial(deferEmbed, _)

  return dPages(metadata)
    .pipe(dFilter)
    .pipe(dImages)
    .pipe(dData)
    .pipe(data => {
      const dDocPages  = _.partial(deferDocPages, _, pDocPages)
      const dDocImages = _.partial(deferDocImages, _, data, pDocImages)
      return dDocPages(data).pipe(dDocImages)
    })
    .pipe(dEmbed)
}

function deferFilter(metadata) {
  const d = $.Deferred()
  let start = $('#docRangeStart');
  let stop = $('#docRangeStop');
  start.prop('defaultValue', 1)
  stop.prop('defaultValue', metadata.length)

  $('#submitRange').on('click', () => {
    const rStart = start.prop('value')
    const rStop = stop.prop('value')
    const res = metadata.filter((elem, idx) =>
      idx >= rStart && idx <= rStop
    )
    $('#imageCount').text(` (${res.length})`)
    d.resolve(res)
  })
  return d.promise()
}

function deferPages(metadata) {
  return defer("pages", _.partial(collectMetadata, metadata))
}

function deferImages(pages, cb) {
  const d = $.Deferred()
  const images = pages.map(page =>
    $('<img/>').attr('crossOrigin', 'anonymous').data(page)
  )
  let loaded = 0
  const updateFn = () => {
    loaded++
    if (cb) cb(loaded, images.length)
    if (loaded >= images.length) delay()(() => d.resolve(images))
  }
  images.forEach(image =>
    image.one("load", updateFn).attr('src', image.data().imageUrl)
  )
  return d.promise()
}

function asData(image) {
  return {
    orientation: image.data().orientation,
    imgData: getBase64Image(image.data().orientation, image[0])
  }
}

function deferData(images, cb) {
  return deferEach("data", images, asData, cb)
}

function deferDocPages(data, cb) {
  return defer("docPages", function () {
    return data.reduce(
      (doc, datum, idx) => {
        if (cb) cb(idx + 1, data.length)
        return addPage(doc, "a4", datum.orientation)
      },
      null
    )
  })
}

function asDocImage(doc, datum, idx) {
  doc.setPage(idx + 1)
  doc.addImage(datum.imgData, "JPEG", 0, 0)
  return doc
}

function deferDocImages(doc, data, cb) {
  const d = $.Deferred()
  const ds = data.map((datum, idx) => {
    defer(`docImages-${idx}`, function () {
      if (cb) cb(idx + 1, data.length)
      asDocImage(doc, datum, idx)
    })
  })
  delay(1)(() => {
    $.when.apply($.when, ds).then(() => d.resolve(doc))
  })
  return d.promise()
}

function asEmbed(doc) {
  return PDFObject.embed(doc.output("bloburl"), "#preview-pane", pdfObjOptions);
}

function deferEmbed(doc) {
  return defer("embed", _.partial(asEmbed, doc))
}

function addPage(doc, format, orientation) {
  return doc == null ?
    new jsPDF({format: format, orientation: orientation, unit: "pt"}) :
    doc.addPage(format, orientation);
}

function getBase64Image(orientation, img) {
  const pageSize = jsPDF.getPageSize(orientation, "px", "a4")
  const canvas   = document.createElement("canvas");
  canvas.width   = pageSize.width;
  canvas.height  = pageSize.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, img.width, img.height);
  return canvas;
}
