package com.barberia.stylebook.repository;

import com.barberia.stylebook.domain.entity.Client;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ClientRepository extends JpaRepository<Client, UUID> {
    Optional<Client> findByPhone(String phone);

    Optional<Client> findByPhoneNormalized(String phoneNormalized);

    boolean existsByPhoneAndIdNot(String phone, UUID id);

    boolean existsByPhoneNormalizedAndIdNot(String phoneNormalized, UUID id);
}
