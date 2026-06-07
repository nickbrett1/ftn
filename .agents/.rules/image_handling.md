## Image Handling

We use **@zerodevx/svelte-img** for optimized image loading.

1.  **Placement**: Store all source images in `webapp/src/lib/images/`.
2.  **Importing**: Import images in your Svelte components with the `?as=run` query parameter.
    ```javascript
    import myImage from '$lib/images/my-image.jpg?as=run';
    ```
3.  **Usage**: Use the `Img` component to display them.
    ```html
    <script>
      import Img from '@zerodevx/svelte-img';
      import myImage from '$lib/images/my-image.jpg?as=run';
    </script>

    <Img src={myImage} alt="Description" class="your-classes" />
    ```
