const preprocessMath = (text) => {
    if (!text) return "";
    let res = text;
    res = res.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
    res = res.replace(/\\\((.*?)\\\)/g, '$$$1$$');
    
    res = res.replace(/\[\s*([^[\]]*?[\^\\=][^[\]]*?)\s*\](?!\()/g, '$$$$ $1 $$$$');
    res = res.replace(/\(\s*([^()]*?[\^\\=][^()]*?)\s*\)/g, '$ $1 $');
    return res;
};
const input = `
[ \\frac{dy}{dx} + 3y = 6 ]
(y = Ce^{-3x} - 2)
[ y'' - 4y' + 4y = 0 ]
(y = C_1 e^{2x} + C_2 e^{-2x})
[ A = \\begin{bmatrix} 1 & 2 \\ 3 & 4 \\end{bmatrix} ]
[markdown link](http://example.com)
`;
console.log(preprocessMath(input));
