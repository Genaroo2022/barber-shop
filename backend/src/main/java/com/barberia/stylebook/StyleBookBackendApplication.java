package com.barberia.stylebook;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class StyleBookBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(StyleBookBackendApplication.class, args);
    }
}
