import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

export const parseMarkdownToJson = (markdown) => {
  const tree = unified().use(remarkParse).parse(markdown);
  const jsonResult = [];

  visit(tree, (node) => {
    if (node.type === 'heading' || node.type === 'paragraph') {
      jsonResult.push({
        type: node.type,
        level: node.depth || undefined,
        text: node.children?.map((child) => child.value || '').join(''),
      });
    }
  });

  return jsonResult;
};
