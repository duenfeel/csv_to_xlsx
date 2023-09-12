const express = require('express');
const fileUpload = require('express-fileupload');
const csvtojson = require('csvtojson');
const XLSX = require('xlsx');
const fs = require('fs');
const app = express();
const path = require('path');

app.use(fileUpload());

app.get('', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});


// 은행명을 코드로 변환하는 객체
const bankCodes = {
    '국민': "004",
    '경남': "039",
    '광주': "034",
    '기업': "003",
    '농협': "011",
    '대구': "031",
    '부산': "032",
    '산업': "002",
    '저축': "050",
    '새마을금고': "045",
    '수협': "007",
    '신한': "088",
    '신협': "048",
    "씨티": '027',
    "하나": '081',
    "우리": '020',
    "우체국": '071',
    "전북": '037',
    "제일": '023',
    "제주": '035',
    "HSBC": '054',
    "케이뱅크": "089",
    "카카오": "090"
};

app.post('/process/csv', async (req, res) => {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('업로드된 파일이 없습니다.');
    }

    const csvFile = req.files.csv;

    // 파일 이름을 UTF-8로 디코딩
    const decodedFileName = decodeURIComponent(escape(csvFile.name));

    // 파일을 서버에 저장
    const uploadPath = path.join(__dirname, 'uploads', decodedFileName);
    try {
        await csvFile.mv(uploadPath);

        // csv 파일을 읽고 수정
        const jsonData = await csvtojson({ encoding: 'utf8' }).fromFile(uploadPath);

        // '통장' 열에 있는 은행명을 은행 코드로 변환
        const modifiedData = jsonData.map(row => {
            const bankAndAccount = row['통장'].split(' '); // 통장 컬럼을 공백으로 분리
            const bankName = bankAndAccount[0]; // 첫 번째 요소는 은행명
            const bankCode = bankCodes[bankName] || ''; // 은행명을 코드로 변환
            const accountNumber = bankAndAccount.slice(1).join(' '); // 나머지 요소는 계좌번호

            return {
                '은행 코드': bankCode,
                '통장': accountNumber, // 계좌번호로 업데이트
                '지급금액': row['정산금'],
                '정산일': row['정산일'],
                '저작권자': row['저작권자'],
            };
        });

        // 변환된 데이터를 xlsx 형식으로 저장
        const ws = XLSX.utils.json_to_sheet(modifiedData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
        const xlsxFileName = decodedFileName.replace('.csv', '.xlsx');
        const xlsxFilePath = path.join(__dirname, 'uploads', xlsxFileName);
        XLSX.writeFile(wb, xlsxFilePath, { bookSST: true, type: 'binary', encoding: 'utf8' });

        // 클라이언트에 xlsx 파일 제공
        res.download(xlsxFilePath, xlsxFileName, (err) => {
            if (err) {
                return res.status(500).send(err);
            }

            // xlsx 파일 다운로드 후 삭제
            fs.unlinkSync(xlsxFilePath);
        });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.listen(3000, function () {
    console.log('3000 포트에서 서버가 실행 중입니다.');
});
