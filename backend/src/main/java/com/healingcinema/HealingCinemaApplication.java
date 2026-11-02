package com.healingcinema;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HealingCinemaApplication {
    public static void main(String[] args) {
        SpringApplication.run(HealingCinemaApplication.class, args);
    }
}
