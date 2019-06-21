// ビデオタグ
let player = document.getElementById('player');
// canvasタグ
let snapshotCanvas = document.getElementById('snapshot');
// ボタンタグ
let captureButton = document.getElementById('capture');
// ラズパイのngrokURL
let raspiServerURL = '';
// ラズパイに対するリクエストコマンド
let raspiRequestCommandTmp = '';

// カメラアクセス成功時のコールバック
let handleSuccess = function(stream) {
  // 起動時にカメラ入力をビデオタグに出力する
  player.srcObject = stream;
  
  // Videoタグを横幅いっぱいに広げる
  player.width = window.innerWidth;
};

// ラズパイに対してリクエストを送信
function sendRequest() {
    if(raspiRequestCommandTmp == 'lock' || raspiRequestCommandTmp == 'unlock') {
        
        // ラズパイのcors設定を忘れていたので、中間サーバーにリクエストを任せる
        fetch("https://get-request-to-raspi.herokuapp.com", {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            "url": raspiServerURL,
            "path": raspiRequestCommandTmp
          })
        })
        .then((response) => {
            console.log(response.ok);
        });
    }
    
    $('#modal1').modal('hide');
}

// 推論結果を表示
function showResult(label) {
    let text = label;
    raspiRequestCommandTmp = '';
    
    if(text == 'cat') { // 猫を認識したときLock
        text = 'ロックしますか?'
        raspiRequestCommandTmp = 'lock';
    } else if(text == 'dog') { // 犬を認識したときUnlock
        text = '解除しますか?'
        raspiRequestCommandTmp = 'unlock';
    }
    
    // モーダルウィンドウの内容を変更
    $('#predict-label').text(text);
    $('#predict-image').attr("src","svg/" + label + ".svg");
    // モーダルウィンドウを表示
    $('#modal1').modal('show');
}

// モデルの推論メソッド
function getAccuracyScores(imageData) {
    // モデルをロード
    tf.loadFrozenModel("model/tensorflowjs_model.pb", "model/model.json")
        .then(function(model) {
            // tf.tidyはメモリリークを回避する為に使用する定型メソッド
            z = tf.tidy(function(){
                // js配列をテンソルに変換
                const channels = 3; // grayscale
                let input = tf.fromPixels(imageData, channels);
                
                // 正則化
                input = tf.cast(input, 'float32').div(tf.scalar(255));
                input = input.expandDims();
                
                // モデルの推論
                return model.execute(input).dataSync();  
            })
            // 最大値のラベルをresult関数に渡す
            showResult(label[z.indexOf(Math.max.apply(null, z))]);
        })    
        .catch(function(err){
           document.write(err);
        });
}

// ラズパイサーバーのngrokURLを取得
fetch('https://future-desktop-api.herokuapp.com/', {method: 'GET', mode: 'cors'})
	.then((response) => response.body.getReader())
    .then((reader) => {
        // ReadableStream.read()はPromiseを返す。
        // Promiseは{ done, value }として解決される。
        reader.read().then(({done, value}) => {
          // データを読み込んだとき：doneはfalse, valueは値。
          // データを読み込み終わったとき：doneはtrue, valueはundefined。
          const decoder = new TextDecoder();
          raspiServerURL = decoder.decode(value);
        })
    });

// ボタン押下時のイベント
captureButton.addEventListener('click', function() {
    // canvasタグに画像をダンプ
    let context = snapshot.getContext('2d');
    context.drawImage(player, 0, 0, 224, 224);
    // モデルの推論を実行
    getAccuracyScores(context.getImageData(0, 0, 224, 224));
});

// カメラへのアクセス権を取得し、handleSuccess関数にstreamを流す
navigator.mediaDevices.getUserMedia({
        audio: false,
        video:  {
            width: {min: 224},
            height: {min: 224},
            frameRate: { ideal: 10, max: 15 },
            facingMode: "environment"
        }
    })
    .then(handleSuccess)
    .catch(err => {
    // エラー処理
    console.log("カメラのアクセス権が取得できませんでした");
});