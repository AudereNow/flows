import * as functions from "firebase-functions";

import { Strategy as BearerStrategy } from "passport-http-bearer";
import { Strategy as LocalStrategy } from "passport-local";
import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import passport from "passport";

const app = express();

app.use(
  cors({
    credentials: true,
    origin: true,
    exposedHeaders: ["Authorization"],
  })
);
app.set("trust proxy", 1);
app.use((req, res, next) => {
  console.log(req.path);
  next();
});
app.use(bodyParser.json());
app.use((req, res, next) => {
  console.log("body parsed");
  next();
});
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  console.log("body parsed urlencoded");
  next();
});
app.use(passport.initialize());
app.use((req, res, next) => {
  console.log("passport initialized");
  next();
});

passport.use(
  "bearer",
  new BearerStrategy((token, done) => {
    functions.logger.log("in bearer");
    if (token === "test") {
      done(null, { username: "test" });
    }
    done(null, false);
  })
);

passport.use(
  "local",
  new LocalStrategy((username, password, done) => {
    functions.logger.log("in local");
    if (username === "test" && password === "test") {
      done(null, { username });
    }
    done(null, false);
  })
);

passport.serializeUser((user: any, done) => done(null, user.username));
passport.deserializeUser((username: string, done) => {
  console.log("deserializing");
  done(null, { username });
});

app.post(
  "/users/sign_in",
  (req, res, next) => {
    const { user } = req.body;
    req.body.username = user.username;
    req.body.password = user.password;
    next();
  },
  passport.authenticate("local", { session: false }),
  (req, res) => {
    const { user } = req as any;
    console.log(user);
    res.setHeader("Authorization", "Bearer test");
    res.send({ user: user });
  }
);

app.get(
  "/status",
  passport.authenticate("bearer", { session: false }),
  (req, res) => {
    res.send("ok");
  }
);

app.get(
  "/facilities",
  passport.authenticate("bearer", { session: false }),
  (req, res) => {
    res.send({
      facilities: [
        {
          address: "270, Emuhaya",
          business_registration_number: null,
          country: "Kenya",
          city: "Vihiga",
          dashboard_query_id: "101456708a87a46551b9aecdf8b94263",
          facility_id: "dbfefd7c-ea34-40b5-8095-9f9ac86a9c84",
          id: "dbfefd7c-ea34-40b5-8095-9f9ac86a9c84",
          latitude: "0.0",
          longitude: "0.0",
          mpesa_till_number: "",
          name: "MM Test",
          notes: null,
          phone_number: "0744444444",
          facility_setting: {
            allow_bluetooth_receipt_printing: false,
            allow_zero_prices: false,
            discount_limit_percentage: 2,
            enable_credit: false,
            facility_id: "dbfefd7c-ea34-40b5-8095-9f9ac86a9c84",
            id: "6c328647-8cea-407a-bd56-e0a14d421833",
            sell_with_wholesale_prices: false,
          },
        },
        {
          address: "75563",
          business_registration_number: null,
          country: "Kenya",
          city: "Nairobi",
          dashboard_query_id: "8b993fc554fa65b8a5507ebda4d1627e",
          facility_id: "b05e335c-f5fe-48f9-9fa4-ba1c412d3f1d",
          id: "b05e335c-f5fe-48f9-9fa4-ba1c412d3f1d",
          latitude: "-0.098563",
          longitude: "34.750186",
          mpesa_till_number: "",
          name: "Enit Pharmacy",
          notes: null,
          phone_number: null,
          facility_setting: {
            allow_bluetooth_receipt_printing: false,
            allow_zero_prices: false,
            discount_limit_percentage: 2,
            enable_credit: false,
            facility_id: "b05e335c-f5fe-48f9-9fa4-ba1c412d3f1d",
            id: "825c761e-c641-4b93-9624-16c20e6b51a4",
            sell_with_wholesale_prices: false,
          },
        },
        {
          address: "123 road",
          business_registration_number: null,
          country: "Kenya",
          city: "Kisumu",
          dashboard_query_id: "442410c0-a657-4c79-a9fd-30247c08661f",
          facility_id: "442410c0-a657-4c79-a9fd-30247c08661f",
          id: "442410c0-a657-4c79-a9fd-30247c08661f",
          latitude: "37.9062",
          longitude: "0.0236",
          mpesa_till_number: "12345",
          name: "test_mmdemo's PHARMACY",
          notes: null,
          phone_number: "+12345",
          facility_setting: {
            allow_bluetooth_receipt_printing: false,
            allow_zero_prices: false,
            discount_limit_percentage: 2,
            enable_credit: false,
            facility_id: "442410c0-a657-4c79-a9fd-30247c08661f",
            id: "b730bf1e-dad8-4bb4-90cc-ef34b22f93f8",
            sell_with_wholesale_prices: false,
          },
        },
        {
          address: "123 road",
          business_registration_number: null,
          country: "Kenya",
          city: "Kisumu",
          dashboard_query_id: "326b3242-73b8-4001-9ace-d0a1faf7d999",
          facility_id: "326b3242-73b8-4001-9ace-d0a1faf7d999",
          id: "326b3242-73b8-4001-9ace-d0a1faf7d999",
          latitude: "37.9062",
          longitude: "0.0236",
          mpesa_till_number: "12345",
          name: "test_michael's PHARMACY",
          notes: null,
          phone_number: "+12345",
          facility_setting: {
            allow_bluetooth_receipt_printing: false,
            allow_zero_prices: false,
            discount_limit_percentage: 2,
            enable_credit: false,
            facility_id: "326b3242-73b8-4001-9ace-d0a1faf7d999",
            id: "330d5ae2-b3ab-41b8-a4dd-9f815fd6bb9c",
            sell_with_wholesale_prices: false,
          },
        },
        {
          address: "Tom Mboya Rd, Kisumu, Kenya",
          business_registration_number: null,
          country: "Kenya",
          city: "Kisumu",
          dashboard_query_id: "fb6c2d9c-7ed6-427c-8388-962bf979c108",
          facility_id: "fb6c2d9c-7ed6-427c-8388-962bf979c108",
          id: "fb6c2d9c-7ed6-427c-8388-962bf979c108",
          latitude: "-0.117705",
          longitude: "34.755423",
          mpesa_till_number: "",
          name: "Masatia Chemist2",
          notes: null,
          phone_number: "0712528635",
          facility_setting: {
            allow_bluetooth_receipt_printing: false,
            allow_zero_prices: false,
            discount_limit_percentage: 2,
            enable_credit: false,
            facility_id: "fb6c2d9c-7ed6-427c-8388-962bf979c108",
            id: "b77e001b-72e6-4eaa-b09c-1045c022065c",
            sell_with_wholesale_prices: false,
          },
        },
      ],
    });
  }
);

app.get(
  "/facilities/:facility/care_pathway_instances",
  passport.authenticate("bearer", { session: false }),
  (req, res) => {
    res.send({
      care_pathway_instances: [
        {
          id: "9929fe0e-243e-4f6f-a2a2-3e549d9066a7",
          care_pathway_instance_id: "9648df42-3e84-47a6-a8e0-85537252caea",
          ref: "consent",
          value: "yes",
          loyalty_sold_products: [],
        },
        {
          id: "d85c3afb-de2b-4c3b-b19e-6a530911b6e7",
          care_pathway_instance_id: "9648df42-3e84-47a6-a8e0-85537252caea",
          ref: "fp_choice",
          value: "sayana_condoms",
          loyalty_sold_products: [
            {
              id: "a4cada77-f15b-402e-8938-b9ca5387704c",
              cost_price_cents: 0,
              cost_price_currency: "KES",
              loyalty_price_cents: 0,
              loyalty_price_currency: "KES",
              retail_price_cents: 10500,
              retail_price_currency: "KES",
              wholesale_price_cents: 0,
              wholesale_price_currency: "KES",
              care_pathway_answer_id: "d85c3afb-de2b-4c3b-b19e-6a530911b6e7",
              api: "Medroxyprogesterone",
              brand: "Sayana Press",
              category: "Reproductive Health",
              description: null,
              loyalty_product_id: "SAYANA_PRESS",
              product_id: "",
              stock_code: null,
              strength: null,
              unit_type: "Injection",
              unit_volume: null,
              created_at: "2020-05-14T21:05:39Z",
              updated_at: "2020-05-14T21:05:39Z",
            },
            {
              id: "39aeb880-c417-4746-a16c-d2bee586030c",
              cost_price_cents: 0,
              cost_price_currency: "KES",
              loyalty_price_cents: 0,
              loyalty_price_currency: "KES",
              retail_price_cents: 5000,
              retail_price_currency: "KES",
              wholesale_price_cents: 0,
              wholesale_price_currency: "KES",
              care_pathway_answer_id: "d85c3afb-de2b-4c3b-b19e-6a530911b6e7",
              api: "Condom",
              brand: "",
              category: "Reproductive Health",
              description: null,
              loyalty_product_id: "CONDOMS",
              product_id: "",
              stock_code: null,
              strength: null,
              unit_type: "Condom",
              unit_volume: null,
              created_at: "2020-05-14T21:05:39Z",
              updated_at: "2020-05-14T21:05:39Z",
            },
          ],
        },
        {
          id: "71333f6a-1624-487c-8daf-fd954d35f876",
          care_pathway_instance_id: "9648df42-3e84-47a6-a8e0-85537252caea",
          ref: "fp_ask_pregnant",
          value: "no",
          loyalty_sold_products: [],
        },
        {
          id: "42eb5752-0a3e-4902-85ab-3474ad513b2c",
          care_pathway_instance_id: "9648df42-3e84-47a6-a8e0-85537252caea",
          ref: "photo_sayana",
          value: "null",
          loyalty_sold_products: [],
        },
        {
          id: "768d125c-3bbc-438e-afb8-d173a4c30cde",
          care_pathway_instance_id: "9648df42-3e84-47a6-a8e0-85537252caea",
          ref: "fp_condom_choice",
          value: "yes",
          loyalty_sold_products: [],
        },
        {
          id: "8f1ed468-5501-4886-b356-e15719c95101",
          care_pathway_instance_id: "9648df42-3e84-47a6-a8e0-85537252caea",
          ref: "photo_condoms",
          value: "null",
          loyalty_sold_products: [],
        },
        {
          id: "b49d8db4-9739-4cb4-9c0f-19ec4db5c83c",
          care_pathway_instance_id: "9648df42-3e84-47a6-a8e0-85537252caea",
          ref: "fp_before",
          value: "no",
          loyalty_sold_products: [],
        },
      ],
      loyalty_sold_products: [
        {
          api: "Medroxyprogesterone",
          brand: "Sayana Press",
          care_pathway_answer_id: "d85c3afb-de2b-4c3b-b19e-6a530911b6e7",
          category: "Reproductive Health",
          cost_price_cents: 0,
          description: null,
          id: "a4cada77-f15b-402e-8938-b9ca5387704c",
          loyalty_price_cents: 0,
          product_id: "",
          retail_price_cents: 10500,
          stock_code: null,
          strength: null,
          unit_type: "Injection",
          unit_volume: null,
          wholesale_price_cents: 0,
        },
        {
          api: "Condom",
          brand: "",
          care_pathway_answer_id: "d85c3afb-de2b-4c3b-b19e-6a530911b6e7",
          category: "Reproductive Health",
          cost_price_cents: 0,
          description: null,
          id: "39aeb880-c417-4746-a16c-d2bee586030c",
          loyalty_price_cents: 0,
          product_id: "",
          retail_price_cents: 5000,
          stock_code: null,
          strength: null,
          unit_type: "Condom",
          unit_volume: null,
          wholesale_price_cents: 0,
        },
      ],
      care_pathway_answer_photos: [
        {
          id: "802990cc-94fb-45e5-b75c-1ac2dc938df1",
          care_pathway_answer_id: "42eb5752-0a3e-4902-85ab-3474ad513b2c",
        },
        {
          id: "893adb1b-bb82-499c-b849-0ce5a453131f",
          care_pathway_answer_id: "8f1ed468-5501-4886-b356-e15719c95101",
        },
      ],
    });
  }
);

export const api = functions.https.onRequest(app);
