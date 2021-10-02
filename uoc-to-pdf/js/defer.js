
function partition(array, n) {
  return array.length
    ? [array.splice(0, n)].concat(partition(array, n))
    : [];
}

function defer(name, fn, time) {
  const task = $.Deferred()
  delay(time)(
    function () {
      const res = fn()
      console.debug(name, res)
      task.resolve(res)
    }
  )
  return task.promise()
}

function deferEach(name, array, fn, time) {
  const task = $.Deferred()
  const buckets = array.map(
    (elem, idx) =>
      defer(`${name} - ${idx}`, () => fn(elem), time)
  )
  const handler = function () {
    const res = [].slice.call(arguments).reduce(
      (acc, v) => acc.concat(v), []
    )
    console.debug(name, res)
    task.resolve(res)
  }
  delay(time)(
    () => $.when.apply($.when, buckets).then(handler)
  )
  return task.promise()
}

function delay(time) {
  return function(fn) {
    setTimeout(fn, time || 1)
  }
}
