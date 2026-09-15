/**
 * Biblioteca para controle de Robô Hexápode com 2x PCA9685 no BBC micro:bit
 */
//% color="#107c41" icon="\uf544" block="Hexapode PCA9685"
namespace Hexapode {
    const PCA1_ADDR = 0x40; // Placa Lado Direito (Pernas 1, 2, 3)
    const PCA2_ADDR = 0x41; // Placa Lado Esquerdo (Pernas 4, 5, 6)

    // Enum para escolha das Posições Suportadas
    export enum Posicao {
        //% block="0° (Recuado/Início)"
        P0 = 0,
        //% block="90° (Descanso/Neutro)"
        P90 = 90,
        //% block="180° (Avançado/Máximo)"
        P180 = 180
    }

    // Enum para escolha das Pernas
    export enum Perna {
        //% block="Perna 1 (Frontal Dir - Placa 1)"
        P1 = 1,
        //% block="Perna 2 (Média Dir - Placa 1)"
        P2 = 2,
        //% block="Perna 3 (Traseira Dir - Placa 1)"
        P3 = 3,
        //% block="Perna 4 (Traseira Esq - Placa 2)"
        P4 = 4,
        //% block="Perna 5 (Média Esq - Placa 2)"
        P5 = 5,
        //% block="Perna 6 (Frontal Esq - Placa 2)"
        P6 = 6
    }

    // Enum para os motores de uma perna
    export enum MotorPerna {
        //% block="Coxa (Motor 1)"
        Coxa = 0,
        //% block="Fêmur (Motor 2)"
        Femur = 1,
        //% block="Tíbia (Motor 3)"
        Tibia = 2
    }

    // Escreve um registro no chip PCA9685 via I2C
    function writeRegister(addr: number, reg: number, value: number): void {
        let buf = pins.createBuffer(2);
        buf[0] = reg;
        buf[1] = value;
        pins.i2cWriteBuffer(addr, buf);
    }

    // Define o valor PWM do pino no PCA9685
    function setPwm(addr: number, channel: number, on: number, off: number): void {
        let buf = pins.createBuffer(5);
        buf[0] = 0x06 + 4 * channel;
        buf[1] = on & 0xFF;
        buf[2] = (on >> 8) & 0xFF;
        buf[3] = off & 0xFF;
        buf[4] = (off >> 8) & 0xFF;
        pins.i2cWriteBuffer(addr, buf);
    }

    // Converte ângulo (0, 90, 180) para o pulso PWM (150 a 600)
    function anguloParaPWM(angulo: number): number {
        return Math.map(angulo, 0, 180, 150, 600);
    }

    /**
     * Inicializa as duas placas PCA9685 no barramento I2C e ajusta a frequência para 50Hz.
     */
    //% block="Inicializar Hexápode (Placas 0x40 e 0x41)"
    //% weight=100
    export function init(): void {
        let addrs = [PCA1_ADDR, PCA2_ADDR];
        for (let addr of addrs) {
            writeRegister(addr, 0x00, 0x00); // Reset MODE1

            // Define frequência de 50Hz para servos
            let oldmode = pins.i2cReadNumber(addr, NumberFormat.UInt8LE);
            let newmode = (oldmode & 0x7F) | 0x10; // Sleep
            writeRegister(addr, 0x00, newmode);
            writeRegister(addr, 0xFE, 121); // Prescale para 50Hz
            writeRegister(addr, 0x00, oldmode);
            basic.pause(5);
            writeRegister(addr, 0x00, oldmode | 0xa1);
        }
        posicaoDescanso();
    }

    /**
     * Move um motor específico de uma perna para uma das 3 posições (0°, 90°, 180°).
     */
    //% block="Mover na %perna | o motor %motor | para %pos"
    //% weight=90
    export function moverMotor(perna: Perna, motor: MotorPerna, pos: Posicao): void {
        let addr = (perna <= 3) ? PCA1_ADDR : PCA2_ADDR;
        let pinoBase = ((perna - 1) % 3) * 3; // 9 servos por placa em grupos de 3 (pinos 0, 3, 6)
        let canal = pinoBase + motor;

        let pwm = anguloParaPWM(pos);
        setPwm(addr, canal, 0, pwm);
    }

    /**
     * Define a posição dos 3 motores de uma perna de uma só vez.
     */
    //% block="Mover %perna | Coxa: %posCoxa | Fêmur: %posFemur | Tíbia: %posTibia"
    //% weight=80
    export function moverPerna3Motores(perna: Perna, posCoxa: Posicao, posFemur: Posicao, posTibia: Posicao): void {
        moverMotor(perna, MotorPerna.Coxa, posCoxa);
        moverMotor(perna, MotorPerna.Femur, posFemur);
        moverMotor(perna, MotorPerna.Tibia, posTibia);
    }

    /**
     * Coloca todos os 18 servos na posição neutra de descanso (90°).
     */
    //% block="Colocar todas as pernas em Posição de Descanso (90°)"
    //% weight=70
    export function posicaoDescanso(): void {
        for (let p = 1; p <= 6; p++) {
            moverPerna3Motores(p, Posicao.P90, Posicao.P90, Posicao.P90);
        }
    }
}