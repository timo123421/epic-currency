import fs from 'fs';
let file = fs.readFileSync('src/App.tsx', 'utf8');
file = file.replace(/if\(!res.ok\) throw new Error\(data\.error\);/g, 'checkResponseStatus(res, data);');
file = file.replace(/if\(\!res.ok\) throw new Error\(data\.error \|\| data\.message\);/g, 'checkResponseStatus(res, data);');
file = file.replace(/if \(!res.ok\) throw new Error\(data\.error\);/g, 'checkResponseStatus(res, data);');
file = file.replace(/if\(!l2Res.ok\) throw new Error\(l2Data\.error\);/g, 'checkResponseStatus(l2Res, l2Data);');
file = file.replace(/if\(!l3Res.ok\) throw new Error\(l3Data\.error\);/g, 'checkResponseStatus(l3Res, l3Data);');
fs.writeFileSync('src/App.tsx', file);
