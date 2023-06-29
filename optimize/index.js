import { parse, walk } from "svelte/compiler";

const clampContent = (type, content) => {
  switch (type) {
    case "script":
      return `<script>${content}</script>`;
    case "style":
      return `<style>${content}</style>`;
    default:
      return content;
  }
};

const OFFSET = {
  script: "<script>",
  style: "<style>",
  markup: "",
};

const getAst = (type, ast) => {
  switch (type) {
    case "script":
      return ast.instance;
    case "style":
      return ast.css;
    case "markup":
      return ast.html;
  }
};

function walkAndReplace(options, replaceWith) {
  let content = options.content;

  const ast = parse(clampContent(options.type, content), {
    filename: options.filename,
  });

  let cursor = -1 * OFFSET[options.type].length;

  function replaceContent(node, replaceWith, replacee) {
    let replaced =
      replacee ?? content.slice(node.start + cursor, node.end + cursor);
    content = content.replace(replaced, replaceWith);
    cursor += replaceWith.length - replaced.length;
  }

  function getContent(node) {
    return content.slice(node.start + cursor, node.end + cursor);
  }

  walk(getAst(options.type, ast), {
    enter(node, parentNode) {
      replaceWith.apply(this, [
        { node, parentNode },
        replaceContent,
        getContent,
      ]);
    },
  });

  return content;
}


export default function Optimize(){
  return {
    script({ filename, content }) {
      if (filename && !/node_modules/.test(filename)) {
        const code = walkAndReplace(
          {
            type: "script",
            content,
            filename,
          },
          ({ node }, replaceContent) => {
            if (node.type === "ImportDeclaration") {
              if (node.source.value.includes("@paulpopa/icons")) {
                replaceContent(node,
                  node.specifiers.map(({ local, imported }) => 
                    {
                      return `import ${local.name} from "${node.source.value}/${imported.name}.js"`
                    }).join("\n")
                );
              }

            }
          }
        );

        return { code };
      }

      return { code: content };
    },
  };
}

