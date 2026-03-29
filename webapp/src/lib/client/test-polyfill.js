async function test() {
  const rs = new ReadableStream({
    start(controller) {
      controller.enqueue('a');
      controller.close();
    }
  });

  if (!rs[Symbol.asyncIterator]) {
      console.log("No asyncIterator found!");
  } else {
      console.log("asyncIterator found!");
  }
}
test();
