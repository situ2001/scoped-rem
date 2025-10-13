# scoped-rem-loader

Webpack loader of scoped-rem, a tool that makes CSS rem units relative to a custom root font size.

## Why needed

> In short, mixing `rem` units from different sources may lead to inconsistent scaling behavior.

When using `rem` units in CSS, they are always relative to the root element (`<html>`), which can lead to inflexibility in certain scenarios, such as when you want different scaling factors in different sections of a webpage or application.

Here is the scenario from author's experience:

- Here are two mobile applications called A and B, both using a WebView to render web content. And they are managed by different teams. Each team has its own design system and style guidelines.
- Specifically, application B uses a base font size of `13.3333vw` and application A uses a different base font size of `26.6667vw`.
- One day, the team managing application B decided to integrate some components from application A into their app. However, although both applications use `rem` units for styling, the components from application A did not scale correctly within application B because the `rem` units in application A were based on a different root font size than those in application B.
- Dev from application B are frustrated because they have to manually modify all related values in the CSS files of application A to make them work correctly within application B, which is time-consuming and error-prone. And if application A updates their components, the modifications need to be redone.
- To maximize code reuse among applications, reduce development time and maintenance costs, the team needed a way to make the `rem` units in the imported components from application A keep their original scaling behavior as if they still conformed to application A's root font size, even when rendered within application B, without any modification to the original CSS files.

That is why scoped-rem was created.

## Installation

```bash
npm install --save-dev scoped-rem-loader
# pnpm
pnpm add -D scoped-rem-loader
# yarn
yarn add -D scoped-rem-loader
```

## Usage

Just add `scoped-rem-loader` to your webpack config:

> Remember that `scoped-rem-loader` can only handle CSS files, so it should be placed before (logically) `css-loader` or other loaders that transform CSS to non-CSS files.

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'scoped-rem-loader'
        ]
      }
    ]
  }
};
```

Then edit the import statement of your CSS file with query parameters to configure the behavior of `scoped-rem-loader`:

> Parameter descriptions can be found [here](https://github.com/situ2001/scoped-rem/blob/a8b8e211b2ded96442f1a1ecbf536dd3f90884ca/lib/core/src/index.ts#L5-L49).

```js
// from 
// import './styles.css';

// to
import './styles.css?rem-scoped&varname=a-root-font-size&rootval=26.6667vw';
```

Then styles will be transformed from:

```css
.foo {
  width: 2rem;
  height: 3rem;
}
```

to 

```css
:root {
  --a-root-font-size: 26.6667vw;
}

.foo {
  width: calc(2 * var(--a-root-font-size));
  height: calc(3 * var(--a-root-font-size));
}
```

Or you can just transform `rem` to `calc()` without declaring the CSS variable by omitting the `rootval` parameter:

```js
import './styles.css?rem-scoped&varname=a-root-font-size';
```

Then styles will be transformed from:

```css
.foo {
  width: 2rem;
  height: 3rem;
}
```

to 

```css
.foo {
  width: calc(2 * var(--a-root-font-size));
  height: calc(3 * var(--a-root-font-size));
}
```
