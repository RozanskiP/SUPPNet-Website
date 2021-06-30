import { process } from './NeuralNetwork.js';
import * as tf from '@tensorflow/tfjs';

const SUPPNET_WEB_PATH = "https://rozanskit.com/nn_models/suppnet_tfjs/model.json";

onmessage = async function(event){
    var model = event.model;
    var data = event.data;

    model = await download();
    data = await process(model, data);

    postMessage(data,model);
}

async function download(){
    const model = await tf.loadGraphModel(SUPPNET_WEB_PATH);
    return model;
}