package com.barberia.stylebook.repository;

import com.barberia.stylebook.domain.entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ClientRepository extends JpaRepository<Client, UUID> {
    Optional<Client> findByPhone(String phone);

    boolean existsByPhoneAndIdNot(String phone, UUID id);
}
