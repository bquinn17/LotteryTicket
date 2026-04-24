"""Minimal HTML parser + XPath subset for text extraction.

Supports two XPath forms:
    /a/b[2]/c                — absolute path, optional 1-based index
    //*[@id="foo"]/a/b[2]    — anchored at an element with the given id
"""
import re
from html.parser import HTMLParser

_VOID_TAGS = frozenset({"area", "base", "br", "col", "embed", "hr", "img",
                        "input", "link", "meta", "source", "track", "wbr"})
_SEGMENT_RE = re.compile(r"^(\w+)(?:\[(\d+)\])?$")
_ID_PREFIX_RE = re.compile(r'^//\*\[@id="([^"]+)"\](.*)$')


class _Node:
    __slots__ = ("tag", "attrs", "parent", "children", "text_parts")

    def __init__(self, tag, attrs=None, parent=None):
        self.tag = tag
        self.attrs = attrs or {}
        self.parent = parent
        self.children = []
        self.text_parts = []

    def text_content(self):
        parts = list(self.text_parts)
        for child in self.children:
            parts.append(child.text_content())
        return " ".join(p for p in parts if p.strip())


class _Builder(HTMLParser):
    def __init__(self):
        super().__init__()
        self.root = _Node("__root__")
        self.current = self.root

    def handle_starttag(self, tag, attrs):
        node = _Node(tag, dict(attrs), self.current)
        self.current.children.append(node)
        if tag not in _VOID_TAGS:
            self.current = node

    def handle_endtag(self, tag):
        node = self.current
        while node is not self.root and node.tag != tag:
            node = node.parent
        if node is not self.root:
            self.current = node.parent

    def handle_startendtag(self, tag, attrs):
        self.current.children.append(_Node(tag, dict(attrs), self.current))

    def handle_data(self, data):
        self.current.text_parts.append(data)


def _find_by_id(node, target_id):
    if node.attrs.get("id") == target_id:
        return node
    for child in node.children:
        found = _find_by_id(child, target_id)
        if found is not None:
            return found
    return None


def _walk_path(start, path):
    nodes = [start]
    for segment in filter(None, path.split("/")):
        match = _SEGMENT_RE.match(segment)
        if not match:
            return []
        tag = match.group(1)
        index = int(match.group(2) or 1)
        nodes = [
            siblings[index - 1]
            for node in nodes
            for siblings in [[c for c in node.children if c.tag == tag]]
            if len(siblings) >= index
        ]
        if not nodes:
            return []
    return nodes


def _select(root, xpath):
    id_match = _ID_PREFIX_RE.match(xpath)
    if id_match:
        start = _find_by_id(root, id_match.group(1))
        return _walk_path(start, id_match.group(2)) if start else []
    if xpath.startswith("/"):
        return _walk_path(root, xpath)
    return []


def iter_xpath_text(html, xpaths):
    """Yield text content for every node matched by any xpath in order."""
    builder = _Builder()
    builder.feed(html)
    for xpath in xpaths:
        for node in _select(builder.root, xpath):
            yield node.text_content()
