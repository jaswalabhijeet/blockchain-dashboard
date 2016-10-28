/*

    Composant pricipal de l'application
    @author : Joël CHRABIE

    */

// Import des librairies, services, ...
import { Component, AfterViewInit, OnInit } from '@angular/core';
import { User } from '../class/User';
import { Transaction } from '../class/Transaction';

import { AppService } from '../app.service';

import * as _ from 'lodash';
let web3 = require('../utils/web3IPCExtension').web3;

// Effets d'animations GSAP avec TweenMax
import 'gsap';
declare let TweenMax: any;
declare let Sine: any;

@Component({
  selector: 'main',
  templateUrl: './main.html',
  providers: [ AppService ],
  styleUrls: ['./_main.scss']
})

export class MainComponent implements AfterViewInit, OnInit {
  users = [];
  demo: boolean;
  transaction: Transaction;

  constructor (
    private appService: AppService
    ) { }

  ngOnInit () {
    this.demo = this.appService.getUrlData();
  }

  // Fonction lancee lors de l'initialisation du composant: connection à la blockchaine et mise a 
  // l'ecoute des blocks en transit, et dans le cas de demo, création d'une fausse transaction a interval regulier
  ngAfterViewInit () {
    console.log('INIT');
    this.getAllUsers();
    if (this.demo) {
      this.fakeTransaction(5000);
    } else {
      this.blockchainConnect();
    }
  }

  getAllUsers () {
    this.appService.getNames().then(users => {
      this.users = users;
      _.forEach(users, u => u['balance'] = 0);
    });
  }

  fakeTransaction (ms: number) {
    setInterval(() => {
      this.randomTransac();
    }, ms);
  }

  // Fonction de connection à la blockchain
  blockchainConnect () {
    this.appService.getIp().then(ip => {
      web3.setProvider(new web3.providers.HttpProvider(ip[0]['ip']));
      web3.eth.defaultAccount = web3.eth.accounts[0];
      this.blockchainFilter();
    });
  }

  // Fonction de souscription à l'evennement de block sur la blockchaine
  blockchainFilter () {
    let filter = web3.eth.filter('latest');
    filter.watch((error, result) => {
      console.log('Watch capté');
      if (!error) {
        let transac = web3.eth.getTransactionFromBlock(result);
        if (transac) {
          let receipt = web3.eth.getTransactionReceipt(transac.hash);
          if (receipt) {
            console.log('On parse la transaction');
            this.parseTransac(transac);
          }
        }
      } else {
        console.log('Erreur dans le filter.watch');
      }
    });
  }



  /* Fonction de parsing d'un block de transaction en objet de class 'Transaction' et 'User' et recuperation des noms des 
  utilisateur dans un fichier externe*/
  parseTransac (transac: any) {
    let sender: User = null;
    let receiver: User = null;

    sender = this.appService.parseObj({
      address: transac.from,
      name: '',
      balance: Number(web3.eth.getBalance(transac.from).plus(2).toString(10)) / Math.pow(10, 18)
    }, User);

    receiver = this.appService.parseObj({
      address: transac.to,
      name: '',
      balance: Number(web3.eth.getBalance(transac.to).plus(2).toString(10)) / Math.pow(10, 18)
    }, User);

    this.appService.getName(sender).then(name => {
      sender.name = name;
    }, name => {
   });
    this.appService.getName(receiver).then(name => {
      receiver.name = name;
    }, name => {
   });

    if(sender.name=='')
     sender.name = 'UserNb' + this.users.length;

    if(receiver.name=='')
     receiver.name = 'UserNB' + this.users.length;

     
    let indexSender = _.findIndex(this.users, ['address', sender.address]);
    let indexReceiver = _.findIndex(this.users, ['address', receiver.address]);

    console.log("s:" + sender.name);
    console.log("r:" + receiver.name);


    // User unknown, look for an empty place
    if (indexSender === -1) {
        this.users.push(sender);
    }

    if (indexReceiver === -1) {
        this.users.push(receiver);
    }


    this.transaction = this.appService.parseObj({
      sender: sender,
      receiver: receiver,
      amount: transac.value.c[0],
      time: new Date()
    }, Transaction);


    this.newBalance(this.transaction);

    this.appService.setTransaction(this.transaction);
  }

  // Dans le mode Demo, creation d'une transaction fictive et emition au composants enfants
  randomTransac (): any {
    let sender: User;
    let receiver: User;
    let amount: number;

    do {
      sender = this.users[this.randomize(this.users.length)];
      receiver = this.users[this.randomize(this.users.length)];
      amount = this.randomize(2000);
    } while (sender === receiver || sender.balance - amount < 0);

    sender = this.appService.parseObj(sender, User);
    receiver = this.appService.parseObj(receiver, User);

    this.transaction = this.appService.parseObj({
      sender: sender,
      receiver: receiver,
      amount: this.randomize(2000), 
      time: new Date()
    }, Transaction);

    this.transaction.sender.balance -= this.transaction.amount;
    this.transaction.receiver.balance += this.transaction.amount;

    this.newBalance(this.transaction);

    // Emition de la transaction aux autres composants
    this.appService.setTransaction(this.transaction);
  }

  randomize (num: number): number {
    let randomNum = Math.floor(Math.random() * num);
    return randomNum;
  }

  newBalance (transaction: Transaction, reset = 0) {
    let indexSender = _.findIndex(this.users, ['address', transaction.sender.address]);
    let indexReceiver = _.findIndex(this.users, ['address', transaction.receiver.address]);

    this.users[indexSender].balance = transaction.sender.balance - reset;
    this.users[indexReceiver].balance = transaction.receiver.balance - reset;
  }
}
