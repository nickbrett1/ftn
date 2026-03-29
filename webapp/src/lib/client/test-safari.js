async function test() {
  const rs = new ReadableStream({
    start(controller) {
      controller.enqueue('a');
      controller.close();
    }
  });

  try {
    for await (const chunk of rs) {
      console.log(chunk);
    }
  } catch(e) {
    console.error(e);
  }
}
test();
