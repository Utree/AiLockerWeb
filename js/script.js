// ビデオタグ
let player = document.getElementById('player');
// canvasタグ
let snapshotCanvas = document.getElementById('snapshot');
// ボタンタグ
let captureButton = document.getElementById('capture');

// カメラアクセス成功時のコールバック
let handleSuccess = function(stream) {
  // 起動時にカメラ入力をビデオタグに出力する
  player.srcObject = stream;
  
  player.width = window.innerWidth;
};

function predict(label) {
    // モーダルウィンドウの内容を変更
    $('#predict-label').text(label);
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
            
            predict(label[z.indexOf(Math.max.apply(null, z))]);
        })    
        .catch(function(err){
           document.write(err);
        });
}

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