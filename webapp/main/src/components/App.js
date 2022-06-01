import React, { Component } from "react";
import { render } from "react-dom";

function App() {
  return (
    <h1>Login to British Empire Management!!</h1>
  );
}

export default App;

const container = document.getElementById("app");
render(<App />, container);
