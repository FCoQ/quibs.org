{
	var tree=[];

	var newTag=function(tag, content, attr, raw) {
		return {tag:tag.toLowerCase(), content:content, attr:attr, raw:raw};
	}
}

start
  = bbcode*

start_tag
  = "[" tag:tagName "]" { return newTag(tag, '', '', '[' + tag + ']') }
  / "[" tag:tagName "=" attr:[^\]]+ "]" { return newTag(tag, '', attr.join(""), '[' + tag + '=' + attr.join("") + ']') }

end_tag
  = "[/" tag:tagName "]" { return newTag(tag, '', '', '[/' + tag + ']') }

noparse_tag
  = t:start_tag {return t.raw;}
  / t:end_tag &{return (t.tag != 'code')} { return t.raw; }
  / t:TEXT {return t;}

bbcode
  = "[*]" { return newTag('', '[*]') }
  / "[code]"i noparse:noparse_tag* "[/code]"i { return newTag('code', noparse) }
  / start:start_tag &{tree.unshift(start.tag); return true;} content:bbcode* &{tree.shift(start.tag); return true;} end:end_tag &{
  		return end.tag == start.tag;
	} { return newTag(start.tag, content, start.attr, start.raw) }
  / content:TEXT { return newTag('', content) }
  / t:start_tag { return newTag('', t.raw) }
  / t:end_tag &{if (tree[0] != t.tag) return true; return false;} { return newTag('', t.raw) }

tagName
  = tag:[a-zA-Z\*]+ { return tag.join(""); }

TEXT
  = t:TEXT_N+ { return t.join(""); }

TEXT_N
  = !start_tag !end_tag text:. { return text; }